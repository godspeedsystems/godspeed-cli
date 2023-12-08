const fsExtras = require("fs-extra");
import path from "path";
// import interactiveMode from "../../utils/interactiveMode";
// import {
//   buildContainers,
//   getComposeOptions,
//   prepareToStartContainers,
// } from "../../utils/dockerUtility";
// import checkPrerequisite from "../../utils/checkPrerequisite";
import {
  installDependencies,
  validateAndCreateProjectDirectory,
} from "../../utils/index";
import { copyingLocalTemplate } from "../../utils";
import { cloneProjectTemplate } from "../../utils";
import { generateFromExamples } from "../../utils";
import { generateProjectFromDotGodspeed } from "../../utils";
import { log } from "../../utils/signale";
import chalk from "chalk";

/**
 * options = {
 *  --from-template: "path or git repo of template",
 *  --with-example: "wether to copy examples or not",
 * }
 * */

export default async function create(
  projectName: string,
  options: PlainObject,
  cliVersion: string
) {
  // await checkPrerequisite();

  const projectDirPath = path.resolve(process.cwd(), projectName);

  await validateAndCreateProjectDirectory(projectDirPath);
  // directory is created
  let godspeedOptions: GodspeedOptions | null;

  if (options.fromTemplate) {
    await copyingLocalTemplate(projectDirPath, options.fromTemplate);
  } else {
    await cloneProjectTemplate(projectDirPath);
  }

  godspeedOptions = await generateFromExamples(
    projectDirPath,
    options.fromExample
  );

  // if (!godspeedOptions) {
  //   godspeedOptions = await interactiveMode({}, false);
  // }

  godspeedOptions = <GodspeedOptions>godspeedOptions;

  let timestamp = new Date().toISOString();
  godspeedOptions.projectName = projectName;
  godspeedOptions.meta = {
    createTimestamp: timestamp,
    lastUpdateTimestamp: timestamp,
    cliVersionWhileCreation: cliVersion,
    cliVersionWhileLastUpdate: cliVersion,
  };

  // by this time we have all things required to spin up the service and create project
  // let's start the generation process
  await generateProjectFromDotGodspeed(
    projectName,
    projectDirPath,
    godspeedOptions,
    options.fromExample
  );
// removing .git folder in project folder.
  const gitFilePath = path.join(process.cwd(),projectName, ".git");
  fsExtras.removeSync(gitFilePath);

  const addPackageToDependencies = (
    packageName: string,
    packageVersion: string,
    packageJsonPath: string
  ) => {
    // Read the existing package.json file
    fsExtras.readFile(packageJsonPath, 'utf8', (err: any, data: any) => {
      if (err) {
        console.error('Error reading package.json:', err);
        return;
      }
  
      try {
        const packageJson = JSON.parse(data);
  
        // Add the package to the dependencies
        packageJson.dependencies = packageJson.dependencies || {};
        packageJson.dependencies[packageName] = packageVersion;
  
        // Write the updated package.json back to the file
        fsExtras.writeFile(
          packageJsonPath,
          JSON.stringify(packageJson, null, 2),
          'utf8',
          (err: any) => {
            if (err) {
              console.error('Error writing package.json:', err);
              return;
            }
          }
        );
      } catch (parseError) {
        console.error('Error parsing package.json:', parseError);
      }
    });
  };

  await addPackageToDependencies('@godspeedsystems/plugins-prisma-as-datastore','latest',`${projectDirPath}/package.json`)

  await installDependencies(projectDirPath,projectName);

  try {
    // the NEW flow [without containers]
    

    // const composeOptions = await getComposeOptions();

    // if (composeOptions.composeOptions) {
    //   composeOptions.composeOptions.push(`${projectName}_devcontainer`);
    // }

    // composeOptions.cwd = path.resolve(projectDirPath, ".devcontainer");
    // composeOptions.log = process.env.DEBUG ? Boolean(process.env.DEBUG) : false;

    // // check if there are already running resources
    // await prepareToStartContainers(projectName, composeOptions);

    // await buildContainers(
    //   projectName,
    //   godspeedOptions,
    //   composeOptions,
    //   projectDirPath
    // );
  } catch (error) {
    log.error(error);
    fsExtras.rmSync(projectDirPath, { recursive: true });
    process.exit(1);
  }
}
