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
import { execSync, spawn } from "child_process";
import inquirer from "inquirer";
import * as yaml from "js-yaml";
import { cwd } from "process";
import chalk from "chalk";
import ora from "ora";

// Load the plugins list from JSON file
  const pluginsFilePath = path.resolve(__dirname, '../../../pluginsList.json');
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
    const pluginNames = availablePlugins.map((plugin: { value: string; name: string; description: string }) => ({
      value: plugin.value,
      Name: plugin.name.split("plugins-")[1],
      Description: plugin.description,
    }));

const program = new Command();

type ModuleType = "DS" | "ES" | "BOTH";


// Add this function before the addAction function
async function manuallyConfigurePlugin(pluginName: string) {
  console.log(`Manually configuring plugin: ${pluginName}`);
  
  // Extract the plugin type from the name
  const pluginShortName = pluginName.split('/').pop()?.replace('plugins-', '')
    .replace('-as-eventsource', '')
    .replace('-as-datasource', '') || '';
  
  // Determine plugin type based on name
  let moduleType = "ES"; // Default to EventSource
  if (pluginName.includes('-as-datasource') && pluginName.includes('-as-eventsource')) {
    moduleType = "BOTH";
  } else if (pluginName.includes('-as-datasource')) {
    moduleType = "DS";
  }
  
  console.log(`Plugin type: ${moduleType}, name: ${pluginShortName}`);
  
  try {
    switch (moduleType) {
      case "BOTH":
        {
          mkdirSync(
            path.join(process.cwd(), "src", "eventsources", "types"),
            {
              recursive: true,
            }
          );
          mkdirSync(path.join(process.cwd(), "src", "datasources", "types"), {
            recursive: true,
          });

          // Write EventSource files
          writeFileSync(
            path.join(
              process.cwd(),
              "src",
              "eventsources",
              "types",
              `${pluginShortName}.ts`
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
              `${pluginShortName}.yaml`
            ),
            yaml.dump({ type: pluginShortName })
          );

          // Write DataSource files
          writeFileSync(
            path.join(
              process.cwd(),
              "src",
              "datasources",
              "types",
              `${pluginShortName}.ts`
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
              `${pluginShortName}.yaml`
            ),
            yaml.dump({ type: pluginShortName })
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
              `${pluginShortName}.ts`
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
              `${pluginShortName}.yaml`
            ),
            yaml.dump({ type: pluginShortName })
          );
        }
        break;
      case "ES":
        {
          mkdirSync(path.join(process.cwd(), "src", "eventsources", "types"), {
            recursive: true,
          });
          writeFileSync(
            path.join(
              process.cwd(),
              "src",
              "eventsources",
              "types",
              `${pluginShortName}.ts`
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
              `${pluginShortName}.yaml`
            ),
            yaml.dump({ type: pluginShortName })
          );
        }
        break;
    }
    console.log(`✅ Plugin ${pluginName} manually configured.`);
    return true;
  } catch (error) {
    console.error(`❌ Error manually configuring plugin ${pluginName}:`, error);
    return false;
  }
}

const addAction = async (pluginsList: string[]) => {
  // install that package
  const spinner = ora({
    text: "Installing plugins... ",
    spinner: {
      frames: ["🌍 ", "🌎 ", "🌏 ", "🌐 ", "🌑 ", "🌒 ", "🌓 ", "🌔 "],
      interval: 180,
    },
  });

  // async function installPlugin(pluginsList: string[]) {
  //   try {
  //     spinner.start();
  
  //     return new Promise<void>((resolve, reject) => {
  //       const { exec } = require('child_process');
        
  //       const cmd = `npm install ${pluginsList.join(' ')} --quiet --no-warnings --silent --progress=false`;
        
  //       exec(cmd, { cwd: process.cwd() }, (error: any, stdout: any, stderr: any) => {
  //         if (error) {
  //           spinner.stop();
  //           console.error("Error during installation:", error.message);
  //           reject(error);
  //           return;
  //         }
          
  //         spinner.stop();
  //         console.log("\nPlugins installed successfully!");
  //         console.log(chalk.cyan.bold("Happy coding with Godspeed! 🚀🎉\n"));
  //         resolve();
  //       });
  //     });
  //   } catch (error: any) {
  //     spinner.stop();
  //     console.error("Error during installation:", error.message);
  //     throw error;
  //   }
  // }
  async function installPlugin(pluginsList: string[]) {
    try {
      console.log("Starting plugin installation...");
      console.log(`Plugins to install: ${pluginsList.join(', ')}`);
      
      // Check if pnpm is available
      console.log("Checking for available package managers...");
      const hasPnpm = await checkCommandExists("pnpm");
      
      // Choose the best available package manager
      const packageManager = hasPnpm ? "pnpm" : "npm";
      console.log(`Using package manager: ${packageManager}`);
      
      spinner.text = `Installing plugins with ${packageManager}...`;
      spinner.start();
  
      // Add time tracking
      const startTime = Date.now();
      let dots = 0;
      
      // Update spinner with progress indicators
      const intervalId = setInterval(() => {
        dots = (dots + 1) % 4;
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        spinner.text = `Installing plugins with ${packageManager}${'.'.repeat(dots)} (${elapsed}s elapsed)`;
      }, 1000);
  
      return new Promise<void>((resolve, reject) => {
        const { exec } = require('child_process');
        
        let cmd = '';
        if (packageManager === "pnpm") {
          cmd = `pnpm add ${pluginsList.join(' ')} --reporter=silent`;
        } else {
          cmd = `npm install ${pluginsList.join(' ')} --quiet --no-warnings --silent --progress=false`;
        }
        
        console.log(`Executing command: ${cmd}`);
        
        const childProcess = exec(cmd, { cwd: process.cwd() });
        
        // Capture stdout for debugging
        let stdoutData = '';
        let stderrData = '';
        
        // Log output (even if minimal with silent flags)
        childProcess.stdout?.on('data', (data: any) => {
          stdoutData += data;
          if (data.trim()) {
            console.log(`[${packageManager} output]: ${data.trim()}`);
          }
        });
        
        childProcess.stderr?.on('data', (data: any) => {
          stderrData += data;
          if (data.trim()) {
            console.error(`[${packageManager} error]: ${data.trim()}`);
          }
        });
        
        childProcess.on('exit', (code: number) => {
          clearInterval(intervalId);
          
          if (code !== 0) {
            spinner.stop();
            console.error(`Installation failed with exit code: ${code}`);
            console.error("Error output:", stderrData || "No error output");
            reject(new Error(`Process exited with code ${code}`));
            return;
          }
          
          const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
          spinner.stop();
          console.log(`\nPlugins installed successfully in ${totalTime}s!`);
          console.log(`Installed plugins: ${pluginsList.join(', ')}`);
          console.log(chalk.cyan.bold("Happy coding with Godspeed! 🚀🎉\n"));
          resolve();
        });
      });
    } catch (error: any) {
      spinner.stop();
      console.error("Error during installation:", error.message);
      throw error;
    }
  }
  
  // Helper function to check if a command exists
  async function checkCommandExists(command: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const { exec } = require('child_process');
      const checkCmd = process.platform === 'win32' ? 'where' : 'which';
      
      exec(`${checkCmd} ${command}`, (error: any) => {
        resolve(!error);
      });
    });
  }
  try {
    // Install the plugins first
    await installPlugin(pluginsList);
    
    // Process each plugin
    for (const pluginName of pluginsList) {
      try {
        let configSuccess = false;
        
        // First try the dynamic import
        try {
          console.log(`Trying to import and configure ${pluginName}...`);
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
                mkdirSync(
                  path.join(process.cwd(), "src", "eventsources", "types"),
                  {
                    recursive: true,
                  }
                );
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
          
          configSuccess = true;
          console.log(`✅ Plugin ${pluginName} dynamically configured.`);
          
        } catch (importError: any) {
          console.log(`Dynamic import failed for ${pluginName}: ${importError?.message}`);
          console.log("Falling back to manual configuration...");
          
          // If dynamic import fails, use the manual configuration as fallback
          configSuccess = await manuallyConfigurePlugin(pluginName);
        }
        
        if (configSuccess) {
          console.log(`✅ Plugin "${pluginName}" installed and configured.`);
        } else {
          console.warn(`⚠️ Plugin "${pluginName}" installed but configuration may be incomplete.`);
        }
        
      } catch (error) {
        console.error("Unable to configure plugin:", error);
      }
    }
  } catch (error) {
    console.error("Plugin installation failed:", error);
  }
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

      // Use spawnCommand instead of spawnSync
      const child = spawnSync(
        "npm",
        [
          "uninstall",
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
      console.log("\nPlugins uninstalled successfully!");
      console.log(chalk.cyan.bold("Happy coding with Godspeed! 🚀🎉\n"));
    } catch (error: any) {
      spinner.stop(); // Stop the spinner in case of an error
      console.error("Error during installation:", error.message);
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
