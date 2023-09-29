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

const installAction = async (gsDevOpsPlugin: string) => {
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
  .description(`list of available godspeed devops plugins`)
  .option(
    "--installed",
    "list of installed godspeed devops plugins"
  )
  .action(async (options: PlainObject) => {    
    if (options.installed) {
      if (!existsSync(path.join(gsDevopsPluginsDir, 'package.json'))) {
        console.error("No devops-plugin is installed");
        return
      }

      // @ts-ignore
      let { dependencies } = require(path.join(gsDevopsPluginsDir, 'package.json'));

      for (const installedPlugin of Object.keys(dependencies)) {
        console.log(`-> ${installedPlugin}`);
      }
    } else {
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
      console.log(`-> ${result}`);
    }    
  });

const install = program
  .command("install")
  .description(`install a godspeed devops plugin`)
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

    await installAction(answer.gsDevOpsPlugin)
  });

const remove = program
  .command("remove")
  .description(`remove a godspeed devops plugin`)
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
  .description(`update a godspeed devops plugin`)
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

export default { install, list, remove, update };
