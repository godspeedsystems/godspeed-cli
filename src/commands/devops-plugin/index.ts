import { Command } from "commander";
import spawnSync from "cross-spawn";
import path from "path";
import { homedir } from "node:os";
import fs, { existsSync, readFileSync } from "fs";
import { execSync } from "child_process";
import inquirer from "inquirer";
const program = new Command();

const gsDevopsPluginsDir = path.join(homedir(), ".godspeed", "devops-plugins");

const addAction = async (gsDevOpsPlugin: string) => {
  try {
    if (!fs.existsSync(gsDevopsPluginsDir)) {
      fs.mkdirSync(gsDevopsPluginsDir, { recursive: true });
    }

    if (!existsSync(path.join(gsDevopsPluginsDir, "package.json"))) {
      spawnSync("npm", ["init", "--yes"], { cwd: gsDevopsPluginsDir });
    }

    // npm install <gsDevOpsPlugin> in the <gsDevopsPluginsDir> directory
    spawnSync("npm", ["i", `${gsDevOpsPlugin}`], {
      cwd: gsDevopsPluginsDir,
      stdio: "inherit",
    });
  } catch (error) {
    console.error(error);
  }
};

const add = program
  .command("add [pluginName]")
  .description(`Add a godspeed devops plugin.`)
  .action(async (pluginName) => {
    let chosenPluginName = pluginName;

    if (!chosenPluginName) {
      const command = "npm search @godspeedsystems/plugins --json";
      const stdout = execSync(command, { encoding: "utf-8" });
      const availablePlugins = JSON.parse(stdout.trim());
      const pluginNames = availablePlugins.map((plugin: any) => plugin.name);
      const answer = await inquirer.prompt([
        {
          type: "list",
          name: "gsDevOpsPlugin",
          message: "Please select devops plugin to install.",
          default: "latest",
          choices: pluginNames,
          loop: false,
        },
      ]);
      chosenPluginName = answer.gsDevOpsPlugin;
    }

    // Make sure a plugin name is provided or selected
    if (!chosenPluginName) {
      console.error("Please provide a plugin name.");
      process.exit(1);
    }

    // Call the add action with the specified pluginName
    await addAction(chosenPluginName);
  });

const remove = program
  .command("remove [pluginName]")
  .description("Remove a godspeed devops plugin.")
  .action(async (pluginName) => {
    if (pluginName) {
      // If the optional argument is provided, directly remove that plugin
      uninstallDevOpsPlugin(pluginName);
    } else {
      let pluginsList;
      try {
        // List all the installed plugins
        pluginsList = JSON.parse(
          readFileSync(path.join(gsDevopsPluginsDir, "package.json"), {
            encoding: "utf-8",
          })
        ).dependencies;

        // If package.json doesn't have "dependencies" key
        if (!pluginsList) throw new Error();
      } catch (error) {
        console.error("There are no devops plugins installed.");
        return;
      }

      // Ask the user to select the plugin to remove
      const answer = await inquirer.prompt([
        {
          type: "list",
          name: "gsDevOpsPlugin",
          message: "Please select a devops plugin to remove.",
          default: "",
          choices: Object.keys(pluginsList).map((pluginName) => ({
            name: pluginName,
            value: pluginName,
          })),
          loop: false,
        },
      ]);

      // Remove the selected plugin
      uninstallDevOpsPlugin(answer.gsDevOpsPlugin);
    }
  });

function uninstallDevOpsPlugin(pluginName: any) {
  // Use npm to uninstall the plugin
  const result = spawnSync("npm", ["uninstall", `${pluginName}`], {
    cwd: gsDevopsPluginsDir,
    stdio: "inherit",
  });
}

const update = program
  .command("update")
  .description(`Update a godspeed devops plugin.`)
  .action(async () => {
    let pluginsList;
    try {
      // list all the installed plugins
      // if, file not found, throws error
      pluginsList = JSON.parse(
        readFileSync(path.join(gsDevopsPluginsDir, "package.json"), {
          encoding: "utf-8",
        })
      ).dependencies;

      // id package.json dont have "dependencies" key
      if (!pluginsList) throw new Error();
    } catch (error) {
      console.error("There are no devops plugins installed.");
      return;
    }

    // ask user to select the plugin to remove
    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "gsDevOpsPlugin",
        message: "Please select devops plugin to update.",
        default: "",
        choices: Object.keys(pluginsList).map((pluginName) => ({
          name: pluginName,
          value: pluginName,
        })),
        loop: false,
      },
    ]);

    // npm install <gsDevOpsPlugin> in the <gsDevopsPluginsDir> directory
    spawnSync("npm", ["update", `${answer.gsDevOpsPlugin}`], {
      cwd: gsDevopsPluginsDir,
      stdio: "inherit",
    });
  });

export default { add, remove, update };
