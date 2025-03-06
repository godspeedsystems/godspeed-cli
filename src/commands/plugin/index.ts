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
import ora from "ora";
import { spawn } from "child_process";

// Load the plugins list from JSON file
const pluginsFilePath = path.resolve(__dirname, "../../../pluginsList.json");
if (!fs.existsSync(pluginsFilePath)) {
  console.error("Error: pluginsList.json file not found!");
  process.exit(1);
}
const pluginsData = fs.readFileSync(pluginsFilePath, { encoding: "utf-8" });
const availablePlugins = JSON.parse(pluginsData);

// or Search the plugins list from npm
// const command = "npm search @godspeedsystems/plugins --json";
// const stdout = execSync(command, { encoding: "utf-8" });
// const availablePlugins = JSON.parse(stdout.trim());

// Map to the format expected by the UI
const pluginNames = availablePlugins.map(
  (plugin: { value: string; name: string; description: string }) => ({
    value: plugin.value,
    Name: plugin.name.split("plugins-")[1],
    Description: plugin.description,
  })
);

const program = new Command();

type ModuleType = "DS" | "ES" | "BOTH";

// const addAction = async (pluginsList: string[]) => {
//   // install that package
//   const spinner = ora({
//     text: "Installing plugins... ",
//     spinner: {
//       frames: ["🌍 ", "🌎 ", "🌏 ", "🌐 ", "🌑 ", "🌒 ", "🌓 ", "🌔 "],
//       interval: 180,
//     },
//   });

//   async function installPlugin(pluginsList: string[]) {
//     try {
//       spinner.start();
//       console.log("yaswanth")
//       // Use spawnCommand instead of spawnSync
//       const child = spawnSync(
//         "pnpm",
//         ["add", ...pluginsList, "--silent", "--no-progress"],
//         {
//           stdio: "pipe", // Redirect output
//         }
//       );

//       await new Promise<void>((resolve) => {
//         child.on("close", () => {
//           resolve();
//         });
//       });

//       spinner.stop(); // Stop the spinner when the installation is complete
//       console.log("\nPlugins installed successfully!");
//       console.log(chalk.cyan.bold("Happy coding with Godspeed! 🚀🎉\n"));
//     } catch (error: any) {
//       spinner.stop(); // Stop the spinner in case of an error
//       console.error("Error during installation:", error.message);
//     }
//   }
//   // Call the installPlugin function
//   await installPlugin(pluginsList);

//   pluginsList.map(async (pluginName: string) => {
//     try {
//       const Module = await import(
//         path.join(process.cwd(), "node_modules", pluginName)
//       );

//       let moduleType = Module.SourceType as ModuleType;
//       let loaderFileName = Module.Type as string;
//       let yamlFileName = Module.CONFIG_FILE_NAME as string;
//       let defaultConfig = Module.DEFAULT_CONFIG || ({} as PlainObject);

//       switch (moduleType) {
//         case "BOTH":
//           {
//             mkdirSync(
//               path.join(process.cwd(), "src", "eventsources", "types"),
//               {
//                 recursive: true,
//               }
//             );
//             mkdirSync(path.join(process.cwd(), "src", "datasources", "types"), {
//               recursive: true,
//             });

//             writeFileSync(
//               path.join(
//                 process.cwd(),
//                 "src",
//                 "eventsources",
//                 "types",
//                 `${loaderFileName}.ts`
//               ),
//               `
//     import { EventSource } from '${pluginName}';
//     export default EventSource;
//               `
//             );
//             writeFileSync(
//               path.join(
//                 process.cwd(),
//                 "src",
//                 "eventsources",
//                 `${yamlFileName}.yaml`
//               ),
//               yaml.dump({ type: loaderFileName, ...defaultConfig })
//             );

//             writeFileSync(
//               path.join(
//                 process.cwd(),
//                 "src",
//                 "datasources",
//                 "types",
//                 `${loaderFileName}.ts`
//               ),
//               `
//     import { DataSource } from '${pluginName}';
//     export default DataSource;
//               `
//             );
//             writeFileSync(
//               path.join(
//                 process.cwd(),
//                 "src",
//                 "datasources",
//                 `${yamlFileName}.yaml`
//               ),
//               yaml.dump({ type: loaderFileName, ...defaultConfig })
//             );
//           }
//           break;
//         case "DS":
//           {
//             mkdirSync(path.join(process.cwd(), "src", "datasources", "types"), {
//               recursive: true,
//             });
//             writeFileSync(
//               path.join(
//                 process.cwd(),
//                 "src",
//                 "datasources",
//                 "types",
//                 `${loaderFileName}.ts`
//               ),
//               `
//     import { DataSource } from '${pluginName}';
//     export default DataSource;
//                 `
//             );
//             // special case for prisma for now
//             // @ts-ignore
//             if (Module.Type !== "prisma") {
//               writeFileSync(
//                 path.join(
//                   process.cwd(),
//                   "src",
//                   "datasources",
//                   `${yamlFileName}.yaml`
//                 ),
//                 yaml.dump({ type: loaderFileName, ...defaultConfig })
//               );
//             }
//           }
//           break;
//         case "ES": {
//           mkdirSync(path.join(process.cwd(), "src", "eventsources", "types"), {
//             recursive: true,
//           });
//           writeFileSync(
//             path.join(
//               process.cwd(),
//               "src",
//               "eventsources",
//               "types",
//               `${loaderFileName}.ts`
//             ),
//             `
//     import { EventSource } from '${pluginName}';
//     export default EventSource;
//                 `
//           );
//           writeFileSync(
//             path.join(
//               process.cwd(),
//               "src",
//               "eventsources",
//               `${yamlFileName}.yaml`
//             ),
//             yaml.dump({ type: loaderFileName, ...defaultConfig })
//           );
//         }
//       }
//     } catch (error) {
//       console.error("unable to import the module.", error);
//     }
//   });
//   // create folder for eventsource or datasource respective file
// };

const addAction = async (pluginsList: string[]) => {
  const spinner = ora({
    text: "Installing plugins... ",
    spinner: {
      frames: ["🌍 ", "🌎 ", "🌏 ", "🌐 ", "🌑 ", "🌒 ", "🌓 ", "🌔 "],
      interval: 180,
    },
  });

  async function installPlugin(pluginsList: string[]) {
    try {
      spinner.start();

      const child = spawn("pnpm", ["add", ...pluginsList, "--silent"], {
        stdio: "inherit",
      });

      await new Promise<void>((resolve, reject) => {
        child.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error(`pnpm install failed with code ${code}`));
        });
      });

      spinner.succeed("Plugins installed successfully!");
      console.log(chalk.cyan.bold("Happy coding with Godspeed! 🚀🎉\n"));
    } catch (error: any) {
      spinner.fail("Failed to install plugins.");
      console.error("Error during installation:", error.message);
    }
  }

  // Install plugins before proceeding
  await installPlugin(pluginsList);

  await Promise.all(
    pluginsList.map(async (pluginName) => {
      try {
        const Module = await import(
          path.join(process.cwd(), "node_modules", pluginName)
        );

        let moduleType = Module.SourceType;
        let loaderFileName = Module.Type as string;
        let yamlFileName = Module.CONFIG_FILE_NAME as string;
        let defaultConfig = Module.DEFAULT_CONFIG || {};

        switch (moduleType) {
          case "BOTH": {
            const eventSourcePath = path.join(
              process.cwd(),
              "src",
              "eventsources"
            );
            const dataSourcePath = path.join(
              process.cwd(),
              "src",
              "datasources"
            );

            mkdirSync(path.join(eventSourcePath, "types"), { recursive: true });
            mkdirSync(path.join(dataSourcePath, "types"), { recursive: true });

            writeFileSync(
              path.join(eventSourcePath, "types", `${loaderFileName}.ts`),
              `import { EventSource } from '${pluginName}';\nexport default EventSource;`
            );
            writeFileSync(
              path.join(eventSourcePath, `${yamlFileName}.yaml`),
              yaml.dump({ type: loaderFileName, ...defaultConfig })
            );

            writeFileSync(
              path.join(dataSourcePath, "types", `${loaderFileName}.ts`),
              `import { DataSource } from '${pluginName}';\nexport default DataSource;`
            );
            writeFileSync(
              path.join(dataSourcePath, `${yamlFileName}.yaml`),
              yaml.dump({ type: loaderFileName, ...defaultConfig })
            );
            break;
          }
          case "DS": {
            const dataSourcePath = path.join(
              process.cwd(),
              "src",
              "datasources"
            );
            mkdirSync(path.join(dataSourcePath, "types"), { recursive: true });

            writeFileSync(
              path.join(dataSourcePath, "types", `${loaderFileName}.ts`),
              `import { DataSource } from '${pluginName}';\nexport default DataSource;`
            );

            if (Module.Type !== "prisma") {
              writeFileSync(
                path.join(dataSourcePath, `${yamlFileName}.yaml`),
                yaml.dump({ type: loaderFileName, ...defaultConfig })
              );
            }
            break;
          }
          case "ES": {
            const eventSourcePath = path.join(
              process.cwd(),
              "src",
              "eventsources"
            );
            mkdirSync(path.join(eventSourcePath, "types"), { recursive: true });

            writeFileSync(
              path.join(eventSourcePath, "types", `${loaderFileName}.ts`),
              `import { EventSource } from '${pluginName}';\nexport default EventSource;`
            );
            writeFileSync(
              path.join(eventSourcePath, `${yamlFileName}.yaml`),
              yaml.dump({ type: loaderFileName, ...defaultConfig })
            );
            break;
          }
        }
      } catch (error) {
        console.error(`Unable to import module '${pluginName}':`, error);
      }
    })
  );
};

const add = program
  .command("add [pluginName]")
  .description(`Add an eventsource/datasource plugin.`)
  .action(async (pluginName: string) => {
    let givenPluginName = pluginName;

    let pkgPath = path.join(cwd(), "package.json");
    let localpluginsList = existsSync(pkgPath)
      ? JSON.parse(readFileSync(pkgPath, { encoding: "utf-8" })).dependencies
      : {};
    for (const pluginName in localpluginsList) {
      const isGSPlugin = pluginName.includes("@godspeedsystems/plugins");
      !isGSPlugin && delete localpluginsList[pluginName];
    }

    const missingPlugins = pluginNames.filter(
      (plugin: { value: string | number }) => !localpluginsList[plugin.value]
    );

    if (!givenPluginName) {
      if (pluginNames.length === 0) {
        console.error("No plugins found.");
        process.exit(1);
      } else {
        const inquirerTableCheckbox = require("@adobe/inquirer-table-checkbox");
        inquirer.registerPrompt("search-table", inquirerTableCheckbox);
        const tableCheckboxPrompt = {
          type: "search-table",
          name: "gsPlugin",
          message: "Please select godspeed plugin to install:",
          wordWrap: true,
          pageSize: 5,
          searchable: true,
          style: {
            "padding-left": 1,
            "padding-right": 0,
            head: [],
            border: [],
          },
          colWidths: [40, 80],
          columns: [
            { name: "Name", wrapOnWordBoundary: true },
            { name: "Description", wrapOnWordBoundary: true },
          ],
          rows: missingPlugins,
        };

        async function runPrompt() {
          try {
            const answer = await inquirer.prompt([tableCheckboxPrompt]);
            // console.log(answer);
            // Call the add action with pluginName
            if (answer.gsPlugin.length !== 0) {
              await addAction(answer.gsPlugin);
            } else {
              console.log(chalk.red.bold("select atleast one plugin to add"));
            }
          } catch (error) {
            console.error(error);
          }
        }

        // Call the prompt function
        runPrompt();
      }
    } else {
      let chosenPluginName = null;
      for (const plugin of pluginNames) {
        if (plugin.value === givenPluginName) {
          chosenPluginName = plugin;
          break; // Exit the loop once a match is found
        }
      }
      if (chosenPluginName !== null) {
        chosenPluginName = [`${givenPluginName}`];
        await addAction(chosenPluginName);
        console.log(
          chalk.cyan("\nFor detailed documentation and examples, visit:")
        );
        console.log(
          chalk.yellow.bold(
            `https://www.npmjs.com/package/${givenPluginName}\n`
          )
        );
      } else {
        console.error(chalk.red("\nPlease provide a valid plugin name.\n"));
        process.exit(1);
      }
    }
  });

const removeAction = async (pluginsList: string[]) => {
  const spinner = ora({
    text: "Uninstalling plugins... ",
    spinner: {
      frames: ["🌍 ", "🌎 ", "🌏 ", "🌐 ", "🌑 ", "🌒 ", "🌓 ", "🌔 "],
      interval: 180,
    },
  });
  async function uninstallPlugin(pluginsList: string[]) {
    try {
      spinner.start();

      const child = spawn("pnpm", ["remove", ...pluginsList, "--silent"], {
        stdio: "inherit", // Ensure proper output handling
      });

      await new Promise<void>((resolve, reject) => {
        child.on("close", (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`pnpm remove failed with code ${code}`));
          }
        });
      });

      spinner.stop(); // Stop the spinner when uninstallation is complete
      console.log("\nPlugins uninstalled successfully!");
      console.log(chalk.cyan.bold("Happy coding with Godspeed! 🚀🎉\n"));
    } catch (error: any) {
      spinner.stop(); // Stop the spinner in case of an error
      console.error("Error during uninstallation:", error.message);
    }
  }

  pluginsList.map(async (pluginName: string) => {
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

      // spawnSync("npm", ["uninstall", pluginName], { stdio: "inherit" });
      // Use spawnCommand instead of spawnSync
    } catch (error) {
      console.error("Unable to remove the plugin.", error);
    }
  });

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
        moduleType === "ES"
          ? "src/eventsources/types"
          : "src/datasources/types",
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

  await uninstallPlugin(pluginsList);
};

const remove = program
  .command("remove [pluginName]")
  .description("Remove an eventsource/datasource plugin.")
  .action(async (pluginName: string[]) => {
    if (pluginName) {
      await removeAction([`${pluginName}`]);
    } else {
      let pluginsList: any;
      try {
        // List all the installed plugins
        let pkgPath = path.join(cwd(), "package.json");
        pluginsList = existsSync(pkgPath)
          ? JSON.parse(readFileSync(pkgPath, { encoding: "utf-8" }))
              .dependencies
          : {};
        // console.log(pluginsList)
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

      let pkgPath = path.join(cwd(), "package.json");
      pluginsList = existsSync(pkgPath)
        ? JSON.parse(readFileSync(pkgPath, { encoding: "utf-8" })).dependencies
        : {};
      // console.log(pluginsList)
      for (const pluginName in pluginsList) {
        const isGSPlugin = pluginName.includes("@godspeedsystems/plugins");
        !isGSPlugin && delete pluginsList[pluginName];
      }

      const commonPlugins = pluginNames.filter(
        (plugin: { value: string | number }) => pluginsList[plugin.value]
      );
      const inquirerTableCheckbox = require("@adobe/inquirer-table-checkbox");
      inquirer.registerPrompt("search-table", inquirerTableCheckbox);
      const tableCheckboxPrompt = {
        type: "search-table",
        name: "gsPlugin",
        message: "Please select godspeed plugin to uninstall:",
        wordWrap: true,
        pageSize: 5,
        searchable: true,
        style: { "padding-left": 1, "padding-right": 0, head: [], border: [] },
        colWidths: [40, 80],
        columns: [
          { name: "Name", wrapOnWordBoundary: true },
          { name: "Description", wrapOnWordBoundary: true },
        ],
        rows: commonPlugins,
      };
      async function runPrompt() {
        try {
          const answer = await inquirer.prompt([tableCheckboxPrompt]);
          if (answer.gsPlugin.length !== 0) {
            await removeAction(answer.gsPlugin);
          } else {
            console.log(chalk.red.bold("select atleast one plugin to remove"));
          }
        } catch (error) {
          console.error(error);
        }
      }
      runPrompt();
    }
  });

const update = program
  .command("update")
  .description(`Update an eventsource/datasource plugin.`)
  .action(async (pluginName: string) => {
    let pluginsList: string[];
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

    const spinner = ora({
      text: "Updating plugins... ",
      spinner: {
        frames: ["🌍 ", "🌎 ", "🌏 ", "🌐 ", "🌑 ", "🌒 ", "🌓 ", "🌔 "],
        interval: 180,
      },
    });
    async function updatePlugin(pluginsList: string[]) {
      try {
        spinner.start();

        // Use spawnCommand instead of spawnSync
        const child = spawnSync(
          "npm",
          [
            "update",
            ...pluginsList,
            "--quiet",
            "--no-warnings",
            "--silent",
            "--progress=false",
          ],
          {
            stdio: "inherit", // Redirect output
          }
        );

        await new Promise<void>((resolve) => {
          child.on("close", () => {
            resolve();
          });
        });

        spinner.stop(); // Stop the spinner when the installation is complete
        console.log("\nPlugins updated successfully!");
        console.log(chalk.cyan.bold("Happy coding with Godspeed! 🚀🎉\n"));
      } catch (error: any) {
        spinner.stop(); // Stop the spinner in case of an error
        console.error("Error during updation:", error.message);
      }
    }

    let pkgPath = path.join(cwd(), "package.json");
    pluginsList = existsSync(pkgPath)
      ? JSON.parse(readFileSync(pkgPath, { encoding: "utf-8" })).dependencies
      : {};
    // console.log(pluginsList)
    for (const pluginName in pluginsList) {
      const isGSPlugin = pluginName.includes("@godspeedsystems/plugins");
      !isGSPlugin && delete pluginsList[pluginName];
    }

    // console.log(pluginsList)
    const commonPlugins = pluginNames.filter(
      (plugin: any) => pluginsList[plugin.value]
    );

    const inquirerTableCheckbox = require("@adobe/inquirer-table-checkbox");
    inquirer.registerPrompt("search-table", inquirerTableCheckbox);
    const tableCheckboxPrompt = {
      type: "search-table",
      name: "gsPlugin",
      message: "Please select godspeed plugin to update:",
      wordWrap: true,
      pageSize: 5,
      searchable: true,
      style: { "padding-left": 1, "padding-right": 0, head: [], border: [] },
      colWidths: [40, 80],
      columns: [
        { name: "Name", wrapOnWordBoundary: true },
        { name: "Description", wrapOnWordBoundary: true },
      ],
      rows: commonPlugins,
    };
    async function runPrompt() {
      try {
        const answer = await inquirer.prompt([tableCheckboxPrompt]);
        if (answer.gsPlugin.length !== 0) {
          await updatePlugin(answer.gsPlugin);
        } else {
          console.log(chalk.red.bold("select atleast one plugin to update"));
        }
      } catch (error) {
        console.error(error);
      }
    }
    runPrompt();
  });

export default { add, remove, update };
