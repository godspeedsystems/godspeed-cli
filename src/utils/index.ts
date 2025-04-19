import path from "path";
import fsExtras from "fs-extra";
import os from "os";
import yaml from "yaml";
import inquirer from "inquirer";
import { log } from "./signale";
import { globSync } from "glob";
import ejs from "ejs";
import simpleGit from "simple-git";
import chalk from "chalk";
import { spawnSync } from "child_process";
import spawnCommand from "cross-spawn";
import ora from "ora";
import {
  yamlLoader as loadYaml,
  generateSwaggerJSON,
  logger,
  PlainObject,
  yamlLoader,
} from "@godspeedsystems/core";
const { exec } = require("child_process");

const userID = (): string => {
  if (process.platform == "linux") {
    const cmd = spawnSync("id", ["-u"]);
    const uid = cmd.stdout?.toString().trim();
    return uid;
  } else {
    return "1000";
  }
};

export const validateAndCreateProjectDirectory = async (
  projectDirPath: string
) => {
  try {
    const isDirExist = fsExtras.existsSync(projectDirPath);
    if (isDirExist) {
      const answers = await inquirer.prompt([
        {
          type: "confirm",
          name: "overwrite",
          message: () => {
            console.log(`${chalk.yellow(projectDirPath)} already exists.\n`);
            return chalk.red("Do you want to overwrite the project folder?");
          },
          default: false,
        },
      ]);

      if (!answers.overwrite) {
        console.log(
          chalk.red("\nExiting godspeed create without creating project.")
        );
        process.exit(0);
      }

      fsExtras.rmSync(projectDirPath, { recursive: true, force: true });
    }

    fsExtras.mkdirSync(projectDirPath);
  } catch (error) {
    console.log(
      chalk.red("Error while validateAndCreateProjectDirectory.", error)
    );
  }
};

export const readDotGodspeed = async (
  projectDirPath: string
): Promise<GodspeedOptions> => {
  let godspeedOptions = JSON.parse(
    fsExtras.readFileSync(path.resolve(projectDirPath, ".godspeed"), "utf-8")
  );

  return godspeedOptions;
};

export const copyingLocalTemplate = async (
  projectDirPath: string,
  templateDir: string
): Promise<void> => {
  if (!fsExtras.lstatSync(templateDir)) {
    log.fatal(`${chalk.red(templateDir)} does not exist or path is incorrect.`);
    process.exit(1);
  }

  log.wait(`Copying template from ${chalk.yellow(templateDir)}`);
  fsExtras.cpSync(templateDir, projectDirPath, { recursive: true });
  log.success("Copying template successful.");
};

export const cloneProjectTemplate = async (
  projectDirPath: string
): Promise<void> => {
  try {
    log.wait(`Cloning project template.`);
    const git = simpleGit();
    const REPO = `${process.env.GITHUB_REPO_URL}`;
    // clone godspeedsystems/godspeed-scaffolding repo
    await git.clone(REPO, projectDirPath, {
      "--branch": `${process.env.GITHUB_REPO_BRANCH}`,
      "--depth": "1",
    });

    // TODO: remove git remote
    log.success("Cloning template successful.");
  } catch (error) {
    log.fatal(`Not able to reach template repository.`);
  }
};

export const generateFromExamples = async (
  projectDirPath: string,
  exampleName: string = "hello-world"
): Promise<GodspeedOptions | null> => {
  log.wait(
    `Generating project with ${chalk.yellow(
      exampleName === "hello-world" ? "default" : exampleName
    )} examples.`
  );
  if (
    !fsExtras.existsSync(
      path.resolve(projectDirPath, ".template", "examples", exampleName)
    )
  ) {
    log.fatal(`${chalk.red(exampleName)} is not a valid example.`);
    process.exit(0);
  }

  fsExtras.cpSync(
    path.resolve(projectDirPath, ".template", "examples", exampleName),
    path.resolve(projectDirPath),
    {
      recursive: true,
    }
  );

  // read if there is an .godspeed file
  if (
    fsExtras.existsSync(
      path.resolve(
        projectDirPath,
        ".template",
        "examples",
        exampleName,
        ".godspeed"
      )
    )
  ) {
    return await readDotGodspeed(projectDirPath);
  } else {
    return null;
  }
};

export const compileAndCopyOrJustCopy = async (
  projectDirPath: string,
  sourceFolder: string,
  destinationFolder: string,
  templateData: PlainObject
) => {
  try {
    const fileList = globSync(
      path.resolve(projectDirPath, sourceFolder + "/**/*")
    );
    let isUpdateCall: boolean = false;
    try {
      isUpdateCall = fsExtras
        .lstatSync(path.resolve(process.cwd(), ".godspeed"))
        .isFile();
    } catch (error) {}

    fileList.map(async (sourceFilePath: string) => {
      if (fsExtras.lstatSync(sourceFilePath).isFile()) {
        // CREATE = used from outside
        // UPDATE = used from the directory itself
        let relativeDestinationPath: string;

        relativeDestinationPath = !isUpdateCall
          ? path.relative(
              path.resolve(projectDirPath, sourceFolder),
              sourceFilePath
            )
          : path.resolve(
              projectDirPath,
              destinationFolder,
              path.relative(
                path.resolve(projectDirPath, sourceFolder),
                sourceFilePath
              )
            );

        let finalDestinationWithFileName = path.resolve(
          projectDirPath,
          destinationFolder,
          relativeDestinationPath
        );

        const finallFolderName = path.dirname(finalDestinationWithFileName);

        const finalFileName = finalDestinationWithFileName.substring(
          finalDestinationWithFileName.lastIndexOf(path.sep) + 1
        );

        const fileName = sourceFilePath.split(path.sep).pop() || "";
        const isTemplate = fileName.endsWith(".ejs");

        if (isTemplate) {
          // compile and save

          const template = await ejs.compile(
            fsExtras.readFileSync(sourceFilePath, "utf-8")
          );
          const finalRender = await template(templateData);
          if (!fsExtras.existsSync(finallFolderName)) {
            await fsExtras.mkdirSync(finallFolderName, {
              recursive: true,
            });
          }

          if (finallFolderName && finalFileName) {
            await fsExtras.writeFileSync(
              path.resolve(finallFolderName, fileName.replace(".ejs", "")),
              finalRender.replace(/^\s*\n/gm, "")
            );
          }
        } else {
          // just copy
          if (fileName) {
            try {
              await fsExtras.cpSync(
                sourceFilePath,
                path.resolve(finallFolderName, finalFileName),
                {
                  recursive: true,
                }
              );
            } catch (error) {
              throw error;
            }
          }
        }
      }
    });
  } catch (error) {
    throw error;
  }
};

export const installDependencies = async (
  projectDirPath: string,
  projectName: string
) => {
  const spinner = ora({
    spinner: {
      frames: ["🌍 ", "🌎 ", "🌏 ", "🌐 ", "🌑 ", "🌒 ", "🌓 ", "🌔 "],
      interval: 180,
    },
  }).start("checking package managers...");

  try {
    // Check if pnpm is already available
    const hasPnpm = await checkCommandExists("pnpm");

    // If pnpm is not available, try to use corepack
    if (!hasPnpm) {
      const hasCorepack = await checkCommandExists("corepack");

      if (hasCorepack) {
        spinner.text = "setting up pnpm via corepack...";
        await enableCorepackAndPnpm();
      } else {
        spinner.text = "falling back to npm (slower)...";
      }
    }

    // Choose the best available package manager
    const packageManager = (await checkCommandExists("pnpm")) ? "pnpm" : "npm";

    spinner.text = `installing dependencies with ${packageManager} (this may take a minute)...`;

    // Update spinner text periodically to show activity
    const intervalId = setInterval(() => {
      spinner.text = `still installing... (${new Date().toLocaleTimeString()})`;
    }, 10000);

    const installArgs =
      packageManager === "pnpm"
        ? ["install", "--reporter=silent"]
        : [
            "install",
            "--prefer-offline",
            "--no-audit",
            "--silent",
            "--progress=false",
          ];

    await new Promise<void>((resolve, reject) => {
      const child = spawnCommand(packageManager, installArgs, {
        cwd: projectDirPath,
        stdio: "pipe",
      });

      child.on("close", (code) => {
        clearInterval(intervalId);
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });

      child.on("error", (err) => {
        clearInterval(intervalId);
        reject(err);
      });
    });

    spinner.stop();
    console.log("\ndependencies installed successfully!");
    console.log(
      `${chalk.green("\nSuccessfully created the project")} ${chalk.yellow(
        projectName
      )}.`
    );
    console.log(
      `${chalk.green(
        "Use `godspeed help` command for available commands."
      )} ${chalk.green.bold(
        "\n\nHappy building microservices with Godspeed! 🚀🎉\n"
      )}`
    );
  } catch (error: any) {
    spinner.stop();
    console.error("Error during installation:", error.message);
  }
};

// Check if a command exists and is executable
async function checkCommandExists(command: string): Promise<boolean> {
  try {
    // Use 'which' on Unix-like systems or 'where' on Windows
    const checkCmd = process.platform === "win32" ? "where" : "which";

    return new Promise<boolean>((resolve) => {
      exec(`${checkCmd} ${command}`, (error: any) => {
        resolve(!error);
      });
    });
  } catch (error) {
    return false;
  }
}

// Enable corepack and prepare pnpm
async function enableCorepackAndPnpm(): Promise<void> {
  try {
    // Enable corepack
    await new Promise<void>((resolve, reject) => {
      const child = spawnCommand("corepack", ["enable"], { stdio: "pipe" });

      child.on("close", (code) => {
        if (code === 0 || code === 1) {
          resolve();
        } else {
          reject(new Error(`Corepack enable failed with code ${code}`));
        }
      });

      child.on("error", (err) => {
        reject(err);
      });
    });

    // Prepare and activate pnpm
    await new Promise<void>((resolve, reject) => {
      const child = spawnCommand(
        "corepack",
        ["prepare", "pnpm@latest", "--activate"],
        { stdio: "pipe" }
      );

      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`pnpm preparation failed with code ${code}`));
        }
      });

      child.on("error", (err) => {
        reject(err);
      });
    });
  } catch (error) {
    // Continue even if enabling corepack or preparing pnpm fails
    console.log("Failed to set up pnpm, falling back to npm");
  }
}

// export const installDependencies = async (
//   projectDirPath: string,
//   projectName: string
// ) => {
//   async function installPlugin() {
//     const spinner = ora({
//       spinner: {
//         frames: ["🌍 ", "🌎 ", "🌏 ", "🌐 ", "🌑 ", "🌒 ", "🌓 ", "🌔 "],
//         interval: 180,
//       },
//     }).start("installing dependencies...");
//     try {
//       // Use spawnCommand instead of spawnSync
//       const child = spawnCommand(
//         "npm",
//         [
//           "install",
//           "--quiet",
//           "--no-warnings",
//           "--silent",
//           "--progress=false"
//         ],
//         {
//           cwd: projectDirPath,
//           stdio: "inherit", // Redirect output
//         }
//       );
//       child.on("close", () => {
//         spinner.stop(); // Stop the spinner when the installation is complete
//         console.log("\ndependencies installed successfully!");

//         console.log(
//           `${chalk.green("\nSuccessfully created the project")} ${chalk.yellow(
//             projectName
//           )}.`
//         );

//         console.log(
//           `${chalk.green(
//             "Use `godspeed help` command for available commands."
//           )} ${chalk.green.bold(
//             "\n\nHappy building microservices with Godspeed! 🚀🎉\n"
//           )}`
//         );
//       });
//     } catch (error: any) {
//       spinner.stop(); // Stop the spinner in case of an error
//       console.error("Error during installation:", error.message);
//     }
//   }

//   // Call the installPlugin function
//   await installPlugin();

// };

export const installPackage = async (
  projectDirPath: string,
  package_name: string
) => {
  async function installprisma(): Promise<void> {
    const command = `npm install ${package_name}`;

    return new Promise<void>((resolve, reject) => {
      const child = exec(command, {
        cwd: projectDirPath,
        stdio: "inherit", // Redirect output
      });

      child.on("exit", (code: any) => {
        if (code === 0) {
          resolve();
        } else {
          reject(
            new Error(`Command exited with non-zero status code: ${code}`)
          );
        }
      });

      child.on("error", (error: any) => {
        reject(error);
      });
    });
  }
  await installprisma();
};

export const generateProjectFromDotGodspeed = async (
  projectName: string,
  projectDirPath: string,
  godspeedOptions: GodspeedOptions,
  exampleName: string,
  isUpdate?: boolean
) => {
  try {
    log.wait("Generating project files.");
    const {
      gsNodeServiceVersion,
      servicePort,
      mongodb,
      postgresql,
      mysql,
      kafka,
      redis,
      elasticsearch,
    } = godspeedOptions;

    // fetch UID information
    let userUID = userID();

    // generate .godspeed file
    await fsExtras.writeFileSync(
      path.resolve(projectDirPath, ".godspeed"),
      JSON.stringify(godspeedOptions, null, 2)
    );

    // generate all the dot config files
    if (!isUpdate) {
      await fsExtras.cpSync(
        path.resolve(projectDirPath, ".template", "dot-configs"),
        path.resolve(projectDirPath),
        { recursive: true }
      );

      // generate package.json, tsConfig.json
      for (let file of ["package.json", "tsconfig.json"]) {
        const packageJson = await fsExtras.readJson(
          path.resolve(projectDirPath, `.template/${file}`)
        );

        await fsExtras.writeJsonSync(
          path.resolve(projectDirPath, file),
          {
            ...packageJson,
            name: projectName,
          },
          {
            spaces: "\t",
          }
        );
      }

      // generate .swcrc file
      const swcrc = await fsExtras.readJson(
        path.resolve(projectDirPath, ".template/dot-configs/.swcrc")
      );

      await fsExtras.writeJsonSync(
        path.resolve(projectDirPath, ".swcrc"),
        {
          ...swcrc,
        },
        {
          spaces: "\t",
        }
      );

      // create folder structure
      if (exampleName) {
        fsExtras.cpSync(
          path.resolve(projectDirPath, ".template", "examples", exampleName),
          path.resolve(projectDirPath),
          {
            recursive: true,
          }
        );
      } else {
        fsExtras.cpSync(
          path.resolve(projectDirPath, ".template", "defaults"),
          path.resolve(projectDirPath),
          {
            recursive: true,
          }
        );
      }

      // create project folder structure
      // const projectStructure = [
      //   "config",
      //   "src/events",
      //   "src/functions",
      //   "src/datasources",
      //   "src/mappings",
      // ];

      // projectStructure.map(async (folderName) => {
      //   await fsExtras.mkdirSync(path.resolve(projectDirPath, folderName), {
      //     recursive: true,
      //   });
      // });
    }

    // TODO: generate helm-chats
    // fsExtras.cpSync(
    //   path.resolve(projectDirPath, ".template/helm-charts"),
    //   path.resolve(projectDirPath),
    //   { recursive: true }
    // );

    /**
     * Let's write
     * <><><><><><>
     * What are the files for the project
     * .godspeed [Done]
     * .vscode/* [Done]
     * .devcontainer/* [Done]
     * /helm-charts
     * package.json [Done]
     * /config [Done]
     * /dot-config-files => .dockerignore, .env .eslintrc.json .gitignore .prettierrc .prismagenerator [Done]
     * /src [Done]
     *  /datasources [Done]
     *  /events [Done]
     *  /functions [Done]
     *  /mappings [Done]
     */

    await compileAndCopyOrJustCopy(
      projectDirPath,
      ".template/.devcontainer",
      ".devcontainer",
      {
        dockerRegistry: process.env.DOCKER_REGISTRY,
        dockerPackageName: process.env.DOCKER_PACKAGE_NAME,
        tag: gsNodeServiceVersion,
        projectName: projectName,
        servicePort,
        userUID,
        mongodb,
        postgresql,
        mysql,
        kafka,
        redis,
        elasticsearch,
      }
    );

    log.success("Successfully generated godspeed project files.\n");
  } catch (error) {
    log.fatal("Error while generating files.", error);
  }
};

export const genGraphqlSchema = async () => {
  try {
    const availableApoloeventsources = globSync(
      path.join(process.cwd(), "src/eventsources/*.yaml").replace(/\\/g, "/")
    );
    // Filter files that contain 'Apollo' in their name
    const apolloEventsources = availableApoloeventsources.map(
      (file) => path.parse(file).name
    );

    const questions = [
      {
        type: "checkbox",
        name: "selectedOptions",
        message:
          "Please select the Graphql Event Sources for which you wish to generate the Graphql schema from Godspeed event defs:",
        choices: apolloEventsources,
      },
    ];

    async function runPrompt() {
      try {
        const answers = await inquirer.prompt(questions);
        if (answers.selectedOptions.length == 0) {
          console.log(
            chalk.red("Please select atleast one GraphQL eventsource")
          );
        } else {
          await createSwaggerFile(answers.selectedOptions);
        }
      } catch (error) {
        console.error(error);
      }
    }
    runPrompt();
  } catch (error) {
    console.log(error);
  }

  const createSwaggerFile = async (eventSources: string[]) => {
    const eventPath = path.join(process.cwd(), "/src/events");
    const definitionsPath = path.join(process.cwd(), "/src/definitions");
    const allEventsSchema: PlainObject = await loadYaml(eventPath, true); //all events of the project
    const definitions: PlainObject = await loadYaml(definitionsPath, false);
    eventSources.map(async (eventSourceName: string) => {
      logger.info(
        "Generating graphql schema for %s. First we will create swagger schema in %s",
        eventSourceName,
        os.tmpdir()
      );
      // Find out the events for this eventSourceName key
      const eventSchemas = Object.fromEntries(
        Object.entries(allEventsSchema).filter(([key]) => {
          const eventSourceKey = key.split(".")[0];
          // eventSourceKey is the name of eventsources in this event definition.
          // It could be one like 'http' or more like 'http & graphql'

          if (eventSourceKey == eventSourceName) {
            return true;
          }
          const eventSources = eventSourceKey.split("&").map((s) => s.trim());
          return eventSources.includes(eventSourceName);
        })
      );
      if (Object.keys(eventSchemas).length === 0) {
        logger.fatal(
          chalk.red(
            `Did not find any events for the ${eventSourceName} eventsource. Why don't you define the first one in the events folder?`
          )
        );
        process.exit(1);
      }
      // let swaggerSchema = await generateSwaggerui(eventSchemas,definitions);
      let eventSourceConfig = yaml.parse(
        fsExtras.readFileSync(
          process.cwd() + `/src/eventsources/${eventSourceName}.yaml`,
          { encoding: "utf-8" }
        )
      );
      //The yaml file of the eventsource
      let swaggerSchema = generateSwaggerJSON(
        eventSchemas,
        definitions,
        eventSourceConfig
      );

      // For swagger-to-graphql plugin we need to save this file somewhere
      const swaggerFilePath = path.join(
        os.tmpdir(),
        eventSourceName + "-swagger.json"
      );

      // Write the swagger.json file in the temp folder
      await fsExtras.writeFileSync(
        swaggerFilePath,
        JSON.stringify(swaggerSchema, null, 2)
      );

      logger.info(
        "Generated and saved swagger schema at temporary location %s. Now generating graphql schema from the same.",
        swaggerFilePath
      );

      // genereate graphql schema
      await generateGraphqlSchema(eventSourceName, swaggerFilePath);
    });
  };
};

async function generateGraphqlSchema(
  eventSourceName: string,
  swaggerFilePath: string
) {
  const command = `npx swagger-to-graphql --swagger-schema=${swaggerFilePath} > ./src/eventsources/${eventSourceName}.graphql`;
  exec(command, (error: any, stdout: any, stderr: any) => {
    if (error) {
      console.log(
        chalk.red.bold(
          `Failed to generate Graphql schema for eventsource ${eventSourceName}`
        )
      );
      console.log(chalk.red(error.message));
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    console.log(
      chalk.green(
        `Graphql schema generated successfuly for eventsource ${eventSourceName} at ./src/eventsources/${eventSourceName}.graphql`
      )
    );
  });
}
const generateSwaggerui = async (
  eventsSchema: PlainObject,
  definitions: PlainObject
) => {
  let finalSpec: PlainObject = {};
  const swaggerCommonPart = {
    openapi: "3.0.0",
    info: {
      version: "0.0.1",
      title: "Godspeed: Sample Microservice",
      description:
        "Sample API calls demonstrating the functionality of Godspeed framework",
      termsOfService: "http://swagger.io/terms/",
      contact: {
        name: "Mindgrep Technologies Pvt Ltd",
        email: "talktous@mindgrep.com",
        url: "https://docs.mindgrep.com/docs/microservices/intro",
      },
      license: {
        name: "Apache 2.0",
        url: "https://www.apache.org/licenses/LICENSE-2.0.html",
      },
    },
    paths: {},
  };
  let swaggerSpecBase = JSON.parse(JSON.stringify(swaggerCommonPart));

  finalSpec = swaggerSpecBase;

  Object.keys(eventsSchema).forEach((event: any) => {
    let apiEndPoint = event.split(".")[2];
    apiEndPoint = apiEndPoint.replace(/:([^\/]+)/g, "{$1}"); //We take :path_param. OAS3 takes {path_param}
    const method = event.split(".")[1];
    const eventSchema = eventsSchema[event];

    //Initialize the schema for this method, for given event
    let methodSpec: PlainObject = {
      summary: eventSchema.summary,
      description: eventSchema.description,
      requestBody: eventSchema.body || eventSchema.data?.schema?.body,
      parameters:
        eventSchema.parameters ||
        eventSchema.params ||
        eventSchema.data?.schema?.params,
      responses: eventSchema.responses,
    };

    // Set it in the overall schema
    finalSpec.paths[apiEndPoint] = {
      ...finalSpec.paths[apiEndPoint],
      [method]: methodSpec,
    };
  });

  finalSpec.definitions = definitions;

  return finalSpec;
};
