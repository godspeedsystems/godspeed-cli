import path from "path";
const fsExtras = require("fs-extra");
import inquirer from "inquirer";
import { log } from "./signale";
import { globSync } from "glob";
import ejs from "ejs";
import simpleGit from "simple-git";
import chalk from "chalk";
import { spawnSync } from "child_process";

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
    path.resolve(projectDirPath, `.template/examples/${exampleName}`),
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

export const installDependencies = async (projectDirPath: string) => {
  log.wait("Installing project dependencies.");
  try {
    spawnSync("npm", ["install"], { cwd: projectDirPath });
  } catch (error) {}
  log.success("Successfully installed project dependencies.");
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
        path.resolve(projectDirPath, ".template/dot-configs/"),
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

      // create folder structure
      if (exampleName) {
        fsExtras.cpSync(
          path.resolve(projectDirPath, `.template/examples/${exampleName}`),
          path.resolve(projectDirPath),
          {
            recursive: true,
          }
        );
      } else {
        fsExtras.cpSync(
          path.resolve(projectDirPath, `.template/defaults`),
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

    log.success("Successfully generated godspeed project files.");
  } catch (error) {
    log.fatal("Error while generating files.", error);
  }
};
