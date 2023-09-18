const fsExtras = require("fs-extra");
import interactiveMode from "../../utils/interactiveMode";

import {
  getComposeOptions,
  prepareToStartContainers,
} from "../../utils/dockerUtility";
import path from "path";
import { generateProjectFromDotGodspeed, readDotGodspeed } from "../../utils";
import checkPrerequisite from "../../utils/checkPrerequisite";
import chalk from "chalk";
import { log } from "../../utils/signale";

const ifValidGodspeedRoot = async (): Promise<void> => {
  log.wait("Checking if, on a valid project root.");
  if (fsExtras.existsSync(path.resolve(process.cwd(), ".godspeed"))) {
    log.success(`${chalk.yellow(process.cwd())} is a valid project root.`);
  } else {
    log.fatal(
      `${chalk.yellow(process.cwd())} ${chalk.red(
        "is not a valid godspeed project root.\nIf you are trying to run this command from any sub-directory, Please run this from the root of the godspeed project."
      )}`
    );
    process.exit(1);
  }
};

export default async (options: PlainObject, clieVersion: string) => {
  try {
    // prerequisite
    // Step 1: Read the .godspeed file
    // Step 2: generate project from .godspeed options
    // Step 3: Stop already running containers
    // Step 4: Start new containers

    // check if where the command is executed, it should have valid .godspeed file
    await ifValidGodspeedRoot();

    await checkPrerequisite();

    // check if the command is running in projectRootFolder
    let godspeedOptions: GodspeedOptions;
    godspeedOptions = await interactiveMode(
      await readDotGodspeed(process.cwd()),
      true
    );

    let { projectName } = godspeedOptions;

    await generateProjectFromDotGodspeed(
      projectName,
      process.cwd(),
      godspeedOptions,
      "hello-world",
      true
    );

    const composeOptions = await getComposeOptions();

    if (composeOptions.composeOptions) {
      composeOptions.composeOptions.push(`${projectName}_devcontainer`);
    }

    composeOptions.cwd = path.resolve(process.cwd(), ".devcontainer");
    composeOptions.log = process.env.DEBUG ? Boolean(process.env.DEBUG) : false;

    // check if there are already running resources
    await prepareToStartContainers(projectName, composeOptions);

    // await buildContainers(projectName, godspeedOptions, composeOptions, "");

    log.success(
      `\n\n${chalk.green("Successfully updated the project")} ${chalk.yellow(
        projectName
      )}.`
    );
    console.log(
      `${chalk.green("Open the project in Visual Studio Code,")} ${chalk.yellow(
        "Happy building microservices with Godspeed!"
      )}.`
    );
  } catch (error) {
    console.log("error", error);
  }
};
