import { Command } from "commander";
import path from "path";
import { homedir } from "node:os";
import fs, { existsSync, readFileSync } from "fs";
import { spawnSync } from "child_process";
import inquirer from "inquirer";
import {readdir} from 'fs/promises';

const program = new Command();

const gsDevopsPluginsDir = path.join(
  homedir(),
  ".godspeed",
  "devops-plugins"
);

const addAction = async (gsDevOpsPlugin: string) => {
  try {
    if (!fs.existsSync(gsDevopsPluginsDir)) {
      fs.mkdirSync(gsDevopsPluginsDir, { recursive: true });
    }

    if (!existsSync(path.join(gsDevopsPluginsDir, 'package.json'))) {
      spawnSync('npm', ['init', '--yes'], { cwd: gsDevopsPluginsDir })
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

const list = program
  .command("list")
  .description(`List of available godspeed devops plugins.`)
  .action(async (options) => {    
    // fetch the list of packages, maybe from the plugins repository
    let npmSearch = spawnSync(
      "npm",
      ["search", `@godspeedsystems/devops-plugin`, "--json"],
      { encoding: "utf-8" }
    );
    let availablePlugins:
      | [{ name: string }]
      | [] = JSON.parse(npmSearch.stdout) || [];

    let result = availablePlugins.map(item => item.name).join('\n');
    console.log("List of available devops plugins:");
    console.log(result);
  });

const listInstalled = program
  .command("list-installed")
  .description(`List of installed godspeed devops plugins.`)
  .action(async () => {
    // fetch the list of installed devops-plugins
    const pluginPath = path.resolve(homedir(), `.godspeed/devops-plugins/node_modules/@godspeedsystems/`);

    // check if devops-plugin is installed.
    if (!fs.existsSync(pluginPath)) {
      console.error("No devops-plugin is installed");
      return
    } 

    const installedPlugins = await readdir(pluginPath);
    for (const installedPlugin of installedPlugins) {
      console.log(installedPlugin);
    }
  });  

const add = program
  .command("add")
  .description(`Add a godspeed devops plugin.`)
  .action(async () => {
    // fetch the list of packages, maybe from the plugins repository
    let npmSearch = spawnSync(
      "npm",
      ["search", `@godspeedsystems/devops-plugin`, "--json"],
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
        name: "gsDevOpsPlugin",
        message: "Please select devops plugin to install.",
        default: "latest",
        choices: result,
        loop: false,
      },
    ]);

    await addAction(answer.gsDevOpsPlugin)
  });

const remove = program
  .command("remove")
  .description(`Remove a godspeed devops plugin.`)
  .action(async () => {
    let pluginsList;
    try {
      // list all the installed plugins
      pluginsList = JSON.parse(readFileSync(path.join(gsDevopsPluginsDir, 'package.json'), { encoding: 'utf-8' })).dependencies;

      // id package.json dont have "dependencies" key
      if (!pluginsList) throw new Error();
    } catch (error) {
      console.error('There are no devops plugins installed.');
      return;
    }

    // ask user to select the plugin to remove
    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "gsDevOpsPlugin",
        message: "Please select a devops plugin to remove.",
        default: "",
        choices: Object.keys(pluginsList).map(pluginName => ({ name: pluginName, value: pluginName })),
        loop: false,
      },
    ]);

    // npm install <gsDevOpsPlugin> in the <gsDevopsPluginsDir> directory
    spawnSync("npm", ["uninstall", `${answer.gsDevOpsPlugin}`], {
      cwd: gsDevopsPluginsDir,
      stdio: "inherit",
    });
  });

const update = program
  .command("update")
  .description(`Update a godspeed devops plugin.`)
  .action(async () => {
    let pluginsList;
    try {
      // list all the installed plugins
      // if, file not found, throws error
      pluginsList = JSON.parse(readFileSync(path.join(gsDevopsPluginsDir, 'package.json'), { encoding: 'utf-8' })).dependencies;

      // id package.json dont have "dependencies" key
      if (!pluginsList) throw new Error();
    } catch (error) {
      console.error('There are no devops plugins installed.');
      return;
    }

    // ask user to select the plugin to remove
    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "gsDevOpsPlugin",
        message: "Please select devops plugin to update.",
        default: "",
        choices: Object.keys(pluginsList).map(pluginName => ({ name: pluginName, value: pluginName })),
        loop: false,
      },
    ]);

    // npm install <gsDevOpsPlugin> in the <gsDevopsPluginsDir> directory
    spawnSync("npm", ["update", `${answer.gsDevOpsPlugin}`], {
      cwd: gsDevopsPluginsDir,
      stdio: "inherit",
    });
  });

// const showPlugin = function(devopsPluginPath: string, installedPluginName: string) {
//     const installedPluginPath = path.resolve(devopsPluginPath, installedPluginName, "dist/index.js");
//     spawnSync(
//       "node",
//       [`${installedPluginPath}`]
//     );
//   };

export default { add, list, listInstalled, remove, update };
