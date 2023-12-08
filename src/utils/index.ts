import path from "path";
const fsExtras = require("fs-extra");
import inquirer from "inquirer";
import { log } from "./signale";
import { globSync } from "glob";
import ejs from "ejs";
import simpleGit from "simple-git";
import chalk from "chalk";
import { spawnSync } from "child_process";
import crossSpawn from "cross-spawn";
import spawnCommand from "cross-spawn";
import ora from "ora";
import loadYaml from '@godspeedsystems/core/dist/core/yamlLoader';
const { exec } = require('child_process');

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
    } catch (error) { }

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
  async function installPlugin() {
    const spinner = ora({
      spinner: {
        frames: ["🌍 ", "🌎 ", "🌏 ", "🌐 ", "🌑 ", "🌒 ", "🌓 ", "🌔 "],
        interval: 180,
      },
    }).start("installing dependencies...");
    try {
      // Use spawnCommand instead of spawnSync
      const child = spawnCommand(
        "npm",
        [
          "install",
          "--quiet",
          "--no-warnings",
          "--silent",
          "--progress=false"
        ],
        {
          cwd: projectDirPath,
          stdio: "inherit", // Redirect output
        }
      );
      child.on("close", () => {
        spinner.stop(); // Stop the spinner when the installation is complete
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
      });
    } catch (error: any) {
      spinner.stop(); // Stop the spinner in case of an error
      console.error("Error during installation:", error.message);
    }
  }


  // Call the installPlugin function
  await installPlugin();

};

export const prismaPlugInstall = async (projectDirPath: string) => {
  async function installprisma(): Promise<void> {
    const command = 'npm install @godspeedsystems/plugins-prisma-as-datastore';

    return new Promise<void>((resolve, reject) => {
      const child = exec(command, {
        cwd: projectDirPath,
        stdio: "inherit", // Redirect output
      });

      child.on('exit', (code: any) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command exited with non-zero status code: ${code}`));
        }
      });

      child.on('error', (error: any) => {
        reject(error);
      });
    });
  }
  await installprisma()
}


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

      // generate package.json
      const packageJson = await fsExtras.readJson(
        path.resolve(projectDirPath, ".template/package.json")
      );

      await fsExtras.writeJsonSync(
        path.resolve(projectDirPath, "package.json"),
        {
          ...packageJson,
          name: projectName,
        },
        {
          spaces: "\t",
        }
      );

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
}

export const genGraphqlSchema = async () => {
  try {

    const availableApoloeventsources = globSync(
      path.join(process.cwd(), 'src/eventsources/*.yaml').replace(/\\/g, '/')
    );
    // Filter files that contain 'Apollo' in their name
    const apolloEventsources = availableApoloeventsources
      .map((file) => path.parse(file).name);

    const questions = [
      {
        type: 'checkbox',
        name: 'selectedOptions',
        message: 'Please select the Graphql Event Sources for which you wish to generate the Graphql schema from Godspeed event defs:',
        choices: apolloEventsources,
      },
    ];

    async function runPrompt() {
      try {
        const answers = await inquirer.prompt(questions);
        if (answers.selectedOptions.length == 0) {
          console.log(chalk.red("Please select atleast one GraphQL eventsource"))
        } else {
          await createSwaggerFile(answers.selectedOptions)
        }
      } catch (error) {
        console.error(error);
      }
    }
    runPrompt();
  } catch (error) {
    console.log(error)
  };

  const createSwaggerFile = async (apolloEventsources: string[]) => {
    const eventPath = path.join(process.cwd(), "/src/events");
    const eventsSchema: PlainObject = await loadYaml(eventPath, true);
    apolloEventsources.map(async (each: string) => {
      const apolloEndpoints = Object.fromEntries(
        Object.entries(eventsSchema).filter(([key]) => key.split(".")[0] == each)
      );
      if (Object.keys(apolloEndpoints).length === 0) {
        console.log(chalk.red(`there is no events of ${each} eventsource`))
        process.exit(1);
      }
      let swaggerSchema = await generateSwaggerui(apolloEndpoints);
      const cwd = process.cwd();
      const tempFolderPath = path.join(cwd, '.temp');
      // Check if the .temp folder exists, and create it if not
      if (!fsExtras.existsSync(tempFolderPath)) {
        fsExtras.mkdirSync(tempFolderPath);
      }
      const swaggerFilePath = path.join(tempFolderPath, `${each}swagger.json`);
      // Write the swagger.json file in the .temp folder
      await fsExtras.writeFileSync(swaggerFilePath, JSON.stringify(swaggerSchema, null, 2));

      const command = `npx swagger-to-graphql --swagger-schema=.temp/${each}swagger.json > ./src/eventsources/${each}.graphql`;
      exec(command, (error: any, stdout: any, stderr: any) => {
        if (error) {
          console.log(
            chalk.red.bold(`Failed to generate Graphql schema for eventsource ${each}`)
          );
          console.log(
            chalk.red(error.message)
          );
          return;
        }
        if (stderr) {
          console.error(`stderr: ${stderr}`);
          return;
        }
        console.log(
          chalk.green(`Graphql schema generated successfuly for eventsource ${each} at ./src/eventsources/${each}.graphql`)

        );
      });
    })


  }
}

const generateSwaggerui = (eventsSchema: any) => {
  let finalSpec: PlainObject = {};
  const swaggerCommonPart = {
    "openapi": "3.0.0",
    "info": {
      "version": "0.0.1",
      "title": "Godspeed: Sample Microservice",
      "description": "Sample API calls demonstrating the functionality of Godspeed framework",
      "termsOfService": "http://swagger.io/terms/",
      "contact": {
        "name": "Mindgrep Technologies Pvt Ltd",
        "email": "talktous@mindgrep.com",
        "url": "https://docs.mindgrep.com/docs/microservices/intro"
      },
      "license": {
        "name": "Apache 2.0",
        "url": "https://www.apache.org/licenses/LICENSE-2.0.html"
      }
    },
    "paths": {}
  };
  let swaggerSpecBase = JSON.parse(JSON.stringify(swaggerCommonPart));

  finalSpec = swaggerSpecBase;

  Object.keys(eventsSchema).forEach((event: any) => {
    let apiEndPoint = event.split('.')[2];
    apiEndPoint = apiEndPoint.replace(/:([^\/]+)/g, '{$1}'); //We take :path_param. OAS3 takes {path_param}
    const method = event.split('.')[1];
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

  return finalSpec;
};

