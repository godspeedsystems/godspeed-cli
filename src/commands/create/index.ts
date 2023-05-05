import path from "path";
import fs from "fs";

import { PlainObject } from "../../common";
import interactiveMode from "../../utils/interactiveMode";

/**
 * options = {
 *  --from-template: "path or git repo of template",
 *  --with-example: "wether to copy examples or not",
 *  --dry-run: "should dry run the process"
 * }
 * */

const validateAndCreateProjectDirectory = async (projectDirPath: string) => {
  try {
    if (fs.existsSync(projectDirPath)) {
      if (fs.existsSync(path.resolve(projectDirPath, ".godspeed"))) {
        console.log(
          `${projectDirPath} is already a godspeed project, Do you want to update?`
        );
      } else {
        console.log(
          `${projectDirPath} already exists. Do you want to overwite?`
        );
        // ask user
        if ("yes") {
          console.log(`Creating godspeed project at ${projectDirPath}`);
        } else {
          console.log("Existing the project creatin process.");
        }
      }
    }

    // create project directory
  } catch (error) {}
};

const cloneAndProcess = async (): Promise<PlainObject> => {
  return {};
};

const fetchTemplate = async (
  projectTemplate: string = "default"
): Promise<Boolean> => {
  return true;
};

export default async function create(
  projectName: string,
  options: PlainObject
) {
  const projectDirPath = path.resolve(process.cwd(), projectName);

  await validateAndCreateProjectDirectory(projectDirPath);

  let godspeedOptions: PlainObject;

  if (options.projectTemplate) {
    godspeedOptions = await cloneAndProcess();
  } else {
    // if there is no --from-template=<projectTemplate>, that's the interactive mode
    await interactiveMode();
  }

  // clone the default template, If no template is selected.
  await fetchTemplate(options.projectTemplate);

  // by this time we have all things required to spin up the service and create project
  // let's start the generation process

  if (options.dryRun) {
    // show all the steps
  } else {
    // steps to create the project
    // clone the default OR provided template directory
    // STEP1: generate .devcontainer
    // STEP2: generate Docker file
    // STEP3: generate docker-compose.yml
    // STEP4: generate scripts
    // STEP5: copy examples
    // STEP6: docker compose down and prepare containers
  }
}
