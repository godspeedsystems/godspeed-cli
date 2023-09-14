import { Command } from "commander";
import path from "path";
import { homedir } from "node:os";
import fs, { mkdirSync, writeFileSync } from "fs";
import { spawnSync } from "child_process";
import inquirer from "inquirer";
import * as yaml from "js-yaml";
const program = new Command();

const list = program
  .command("list")
  .description(`List all available godspeed plugins.`)
  .action(async () => {
    // fetch the list of packages, maybe from the plugins repository
    let npmSearch = spawnSync(
      "npm",
      ["search", `@godspeedsystems/plugins`, "--json"],
      { encoding: "utf-8" }
    );
    let availablePlugins:
      | [{ name: string; description: string; version: string }]
      | [] = JSON.parse(npmSearch.stdout) || [];

    let result = availablePlugins.map(({ name, description, version }) => ({
      name,
      description,
      version,
    }));

    // list all the packages starting with plugins
    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "gsPlugin",
        message: "Please select godspeed plugin to install.",
        default: "latest",
        choices: result,
        loop: false,
      },
    ]);

    // install that package
    spawnSync("npm", ["install", `${answer.gsPlugin}`], { stdio: "inherit" });

    // call the add action with pluginName
    await addAction(answer.gsPlugin);
  });
// instance check

type ModuleType = "DS" | "ES" | "BOTH";

const addAction = async (pluginName: string) => {
  // create folder for eventsource or datasource respective file
  try {
    let Module;
    try {
      Module = await import(
        path.join(process.cwd(), "node_modules", pluginName)
      );
    } catch (importError) {
      // If the module doesn't exist, install it using npm
      console.log(`Plugin '${pluginName}' is not installed. Installing...`);
      const npmUninstallResult = spawnSync("npm", ["i", `${pluginName}`], {
        stdio: "inherit",
      });
      // Retry importing the module
      Module = await import(
        path.join(process.cwd(), "node_modules", pluginName)
      );
    }
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
    const npmUninstallResult = spawnSync(
      "npm",
      ["uninstall", `${pluginName}`],
      {
        stdio: "inherit",
      }
    );
    console.log(`Plugin '${pluginName}' removed successfully.`);
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

async function listPackages(): Promise<string[]> {
  const packageJsonPath = path.join(process.cwd(), "package.json");

  try {
    const packageJsonData = fs.readFileSync(packageJsonPath, "utf8");
    const dependencies = JSON.parse(packageJsonData).dependencies || {};
    const packages = Object.keys(dependencies).filter((packageName) =>
      packageName.startsWith("@godspeedsystems/plugins")
    );
    return packages;
  } catch (error: any) {
    console.error("Error reading package.json:", error.message);
    return [];
  }
}

async function selectPackage(packages: string[]): Promise<string | null> {
  const questions = [
    {
      type: "list",
      name: "selectedPackage",
      message: "Select a package to remove:",
      choices: packages,
    },
  ];

  const answers = await inquirer.prompt(questions);
  return answers.selectedPackage || null;
}

const add = program
  .command("add")
  .description(`Add a godspeed plugin.`)
  .argument("<pluginName>", "name of the plugin.")
  .action(async (pluginName) => {
    await addAction(pluginName);
  });

const remove = program
  .command("remove")
  .argument("[pluginName]", "Name of the plugin.")
  .description("Remove a godspeed plugin.")
  .action(async (pluginName) => {
    if (!pluginName) {
      // If pluginName is not provided, list packages from package.json
      const packages = await listPackages();
      if (packages.length === 0) {
        console.log("No packages found in package.json.");
      } else {
        const selectedPackage = await selectPackage(packages);
        if (selectedPackage) {
          await removeAction(selectedPackage);
        } else {
          console.log("No package selected.");
        }
      }
    } else {
      try {
        await removeAction(pluginName);
      } catch (error) {
        // Handle error
      }
    }
  });

const update = program
  .command("update")
  .argument("<pluginName>", "name of the plugin.")
  .description(`Update a godspeed devops plugin.`)
  .action(async (pluginName) => {
    try {
    } catch (error) {}
  });

export default { list, add, remove, update };
