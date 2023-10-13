import { Command } from "commander";
import spawnSync from "cross-spawn";
import path from "path";
import fs, {
  existsSync,
  mkdirSync,
  readFileSync,
  readSync,
  writeFileSync,
} from "fs";
import { execSync } from "child_process";
import inquirer from "inquirer";
import * as yaml from "js-yaml";
import { cwd } from "process";
import chalk from "chalk";
import ora from 'ora';

const program = new Command();

type ModuleType = "DS" | "ES" | "BOTH";

const addAction = async (pluginName: string) => {
  // install that package
  const spinner = ora({
    text: 'Installing plugin... ',
    spinner: {
    frames: ['🌍 ', '🌎 ', '🌏 ', '🌐 ', '🌑 ', '🌒 ', '🌓 ', '🌔 '],
      interval: 180,
    },
  });


    async  function installPlugin(pluginName:any) {
      try {
        spinner.start();
    
        // Use spawnCommand instead of spawnSync
        const child = spawnSync('npm', ['install', `${pluginName}`, '--quiet', '--no-warnings', '--silent', '--progress=false'], {
          stdio: 'inherit', // Redirect output
        });
    
        await new Promise<void>((resolve) => {
          child.on('close', () => {
            resolve();
          });
        });
    
        spinner.stop(); // Stop the spinner when the installation is complete
        console.log('\nPlugin installed successfully!');
        console.log(chalk.cyan.bold('Happy coding with Godspeed! 🚀🎉\n'));
      } catch (error:any) {
        spinner.stop(); // Stop the spinner in case of an error
        console.error('Error during installation:', error.message);
      }
    }
    
    // Call the installPlugin function
    await installPlugin(pluginName);


  // create folder for eventsource or datasource respective file
  try {
    const Module = await import(
      path.join(process.cwd(), "node_modules", pluginName)
    );

    let moduleType = Module.SourceType as ModuleType;
    let loaderFileName = Module.Type as string;
    let yamlFileName = Module.CONFIG_FILE_NAME as string;
    let defaultConfig = Module.DEFAULT_CONFIG || ({} as PlainObject);

    switch (moduleType) {
      case "BOTH":
        {
          mkdirSync(path.join(process.cwd(), "src", "eventsources", "types"), {
            recursive: true,
          });
          mkdirSync(path.join(process.cwd(), "src", "datasources", "types"), {
            recursive: true,
          });

          writeFileSync(
            path.join(
              process.cwd(),
              "src",
              "eventsources",
              "types",
              `${loaderFileName}.ts`
            ),
            `
import { EventSource } from '${pluginName}';
export default EventSource;
          `
          );
          writeFileSync(
            path.join(
              process.cwd(),
              "src",
              "eventsources",
              `${yamlFileName}.yaml`
            ),
            yaml.dump({ type: loaderFileName, ...defaultConfig })
          );

          writeFileSync(
            path.join(
              process.cwd(),
              "src",
              "datasources",
              "types",
              `${loaderFileName}.ts`
            ),
            `
import { DataSource } from '${pluginName}';
export default DataSource;
          `
          );
          writeFileSync(
            path.join(
              process.cwd(),
              "src",
              "datasources",
              `${yamlFileName}.yaml`
            ),
            yaml.dump({ type: loaderFileName, ...defaultConfig })
          );
        }
        break;
      case "DS":
        {
          mkdirSync(path.join(process.cwd(), "src", "datasources", "types"), {
            recursive: true,
          });
          writeFileSync(
            path.join(
              process.cwd(),
              "src",
              "datasources",
              "types",
              `${loaderFileName}.ts`
            ),
            `
import { DataSource } from '${pluginName}';
export default DataSource;
            `
          );
          // special case for prisma for now
          // @ts-ignore
          if (Module.Type !== "prisma") {
            writeFileSync(
              path.join(
                process.cwd(),
                "src",
                "datasources",
                `${yamlFileName}.yaml`
              ),
              yaml.dump({ type: loaderFileName, ...defaultConfig })
            );
          }
        }
        break;
      case "ES": {
        mkdirSync(path.join(process.cwd(), "src", "eventsources", "types"), {
          recursive: true,
        });
        writeFileSync(
          path.join(
            process.cwd(),
            "src",
            "eventsources",
            "types",
            `${loaderFileName}.ts`
          ),
          `
import { EventSource } from '${pluginName}';
export default EventSource;
            `
        );
        writeFileSync(
          path.join(
            process.cwd(),
            "src",
            "eventsources",
            `${yamlFileName}.yaml`
          ),
          yaml.dump({ type: loaderFileName, ...defaultConfig })
        );
      }
    }
  } catch (error) {
    console.error("unable to import the module.", error);
  }
};

const add = program
  .command("add [pluginName]")
  .description(`Add an eventsource/datasource plugin.`)
  .action(async (pluginName: string) => {
    let givenPluginName = pluginName;

    const command = "npm search @godspeedsystems/plugins --json";
    const stdout = execSync(command, { encoding: "utf-8" });
    const availablePlugins = JSON.parse(stdout.trim());
    const pluginNames: string[] = availablePlugins.map(
      (plugin: any) => plugin.name
    );
    let chosenPluginName: string;

    if (!givenPluginName) {
      if (pluginNames.length === 0) {
        console.error("No plugins found.");
        process.exit(1);
      } else {
        // Prompt the user to select a plugin
        const answer = await inquirer.prompt([
          {
            type: "list",
            name: "gsPlugin",
            message: "Please select a godspeed plugin to install.",
            default: "latest",
            choices: pluginNames,
            loop: false,
          },
        ]);

        chosenPluginName = answer.gsPlugin;

        await addAction(chosenPluginName);
        console.log(
          chalk.cyan("\nFor detailed documentation and examples, visit:")
        );
        console.log(
          chalk.yellow.bold(
            `https://www.npmjs.com/package/${chosenPluginName}\n`
          )
        );
      }
    } else {
      if (pluginNames.includes(givenPluginName)) {
        chosenPluginName = givenPluginName;
        await addAction(chosenPluginName);
        console.log(
          chalk.cyan("\nFor detailed documentation and examples, visit:")
        );
        console.log(
          chalk.yellow.bold(
            `https://www.npmjs.com/package/${chosenPluginName}\n`
          )
        );
      } else {
        console.error(chalk.red("\nPlease provide a valid plugin name.\n"));
        process.exit(1);
      }
    }
  });

const removeAction = async (pluginName: string) => {
  try {
    // Import the module dynamically
    const Module = await import(
      path.join(process.cwd(), "node_modules", pluginName)
    );

    // Define module-specific variables
    let moduleType = Module.SourceType as ModuleType;
    let loaderFileName = Module.Type as string;
    let yamlFileName = Module.CONFIG_FILE_NAME as string;
    let defaultConfig = Module.DEFAULT_CONFIG || ({} as PlainObject);

    switch (moduleType) {
      case "BOTH":
        // Remove both EventSource and DataSource files
        await removeModule("ES", pluginName, loaderFileName, yamlFileName);
        await removeModule("DS", pluginName, loaderFileName, yamlFileName);
        break;

      // Remove either EventSource or DataSource files

      case "ES":
        await removeModule(
          moduleType,
          pluginName,
          loaderFileName,
          yamlFileName
        );
        break;

      case "DS":
        await removeModule(
          moduleType,
          pluginName,
          loaderFileName,
          yamlFileName
        );
        break;

      default:
        console.error("Invalid moduleType:", moduleType);
        break;
    }

    spawnSync("npm", ["uninstall", pluginName], { stdio: "inherit" });
  } catch (error) {
    console.error("Unable to remove the plugin.", error);
  }
};

// Define a function to remove EventSource or DataSource files
const removeModule = async (
  moduleType: ModuleType,
  pluginName: string,
  loaderFileName: string,
  yamlFileName: string
) => {
  try {
    // Determine the paths to the TypeScript and YAML files
    const tsFilePath = path.join(
      process.cwd(),
      moduleType === "ES" ? "src/eventsources/types" : "src/datasources/types",
      `${loaderFileName}.ts`
    );
    const yamlFilePath = path.join(
      process.cwd(),
      moduleType === "ES" ? "src/eventsources" : "src/datasources",
      `${yamlFileName}.yaml`
    );

    // Check if the TypeScript and YAML files exist and remove them
    await Promise.all([
      fs.unlink(tsFilePath, (err) => {}),
      fs.unlink(yamlFilePath, (err) => {}),
    ]);
  } catch (error) {
    console.error(
      `Unable to remove ${moduleType} module for '${pluginName}'.`,
      error
    );
  }
};

const remove = program
  .command("remove [pluginName]")
  .description("Remove an eventsource/datasource plugin.")
  .action(async (pluginName: string) => {
    if (pluginName) {
      await removeAction(pluginName);
    } else {
      let pluginsList;
      try {
        // List all the installed plugins
        let pkgPath = path.join(cwd(), "package.json");
        pluginsList = existsSync(pkgPath)
          ? JSON.parse(readFileSync(pkgPath, { encoding: "utf-8" }))
              .dependencies
          : {};

        for (const pluginName in pluginsList) {
          const isGSPlugin = pluginName.includes("@godspeedsystems/plugins");
          !isGSPlugin && delete pluginsList[pluginName];
        }

        // If package.json doesn't have "dependencies" key or no valid plugins are found
        if (!pluginsList || Object.keys(pluginsList).length === 0) {
          throw new Error();
        }
      } catch (error) {
        console.error("There are no eventsource/datasource plugins installed.");
        return;
      }

      // Ask the user to select the plugin to remove using a dropdown
      const answer = await inquirer.prompt([
        {
          type: "list",
          name: "gsPlugin",
          message: "Please select an eventsource/datasource plugin to remove:",
          default: "",
          choices: Object.keys(pluginsList).map((pluginName) => ({
            name: pluginName,
            value: pluginName,
          })),
          loop: false,
        },
      ]);

      await removeAction(answer.gsPlugin);
    }
  });

const update = program
  .command("update")
  .description(`Update an eventsource/datasource plugin.`)
  .action(async (pluginName: string) => {
    let pluginsList;
    try {
      // list all the installed plugins
      let pkgPath = path.join(cwd(), "package.json");
      pluginsList = existsSync(pkgPath)
        ? JSON.parse(readFileSync(pkgPath, { encoding: "utf-8" })).dependencies
        : [];

      for (const pluginName in pluginsList) {
        // if the dependency name does not start with @godspeedsystems/plugin-, then it's not a godspeed plugin
        const isGSPlugin = pluginName.includes("@godspeedsystems/plugins");
        !isGSPlugin && delete pluginsList[pluginName];
      }

      // id package.json dont have "dependencies" key
      if (!pluginsList || pluginsList.length) throw new Error();
    } catch (error) {
      console.error("There are no eventsource/datasource plugins installed.");
      return;
    }

    // ask user to select the plugin to remove
    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "gsPlugin",
        message: "Please select a eventsource/datasource plugin to update.",
        default: "",
        choices: Object.keys(pluginsList).map((pluginName) => ({
          name: pluginName,
          value: pluginName,
        })),
        loop: false,
      },
    ]);

    spawnSync("npm", ["update", answer.gsPlugin], { stdio: "inherit" });
  });

export default { add, remove, update };
