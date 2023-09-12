import { Command } from "commander";
import path from "path";
import { homedir } from 'node:os';
import fs, { readFileSync } from "fs";
import { spawnSync } from "child_process";
const program = new Command();

const list = program
  .command("list")
  .description(
    `List all available godspeed devops plugins.`
  )
  .action(() => {
    const gsDevopsPluginsDir = path.join(homedir(), '.godspeed', 'devops-plugins');
    let dependencies = JSON.parse(readFileSync(path.join(gsDevopsPluginsDir, 'package.json'), { encoding: 'utf-8' })).dependencies || {};
    console.log('dependency', dependencies);
  });

const add = program
  .command("add")
  .description(
    `Add a godspeed devops plugin.`
  )
  .argument("<devopsPluginName>", "name of the devops plugin.")
  .action(async (devopsPluginName) => {
    try {
      const gsDevopsPluginsDir = path.join(homedir(), '.godspeed', 'devops-plugins');
      if (!fs.existsSync(gsDevopsPluginsDir)) {
        const res = fs.mkdirSync(gsDevopsPluginsDir, { recursive: true });
      }

      // npm install
      spawnSync("npm", ["i", `${devopsPluginName}`], {
        stdio: "inherit",
      });
    } catch (error) {
    }
  });

const remove = program
  .command("remove")
  .argument("<devopsPluginName>", "name of the devops plugin.")
  .description(
    `Remove a godspeed devops plugin.`
  )
  .action(async (devopsPluginName) => {
    try {
      const gsDevopsPluginsDir = path.join(homedir(), '.godspeed', 'devops-plugins');
      // npm uninstall pluginName
      spawnSync("npm", ["uninstall", `${devopsPluginName}`], {
        stdio: "inherit",
      });
    } catch (error) {
    }
  });

const update = program
  .command("update")
  .argument("<devopsPluginName>", "name of the devops plugin.")
  .description(
    `Update a godspeed devops plugin.`
  )
  .action(async (devopsPluginName) => {
    try {
      const gsDevopsPluginsDir = path.join(homedir(), '.godspeed', 'devops-plugins');
      // npm uninstall pluginName
      spawnSync("npm", ["update", `${devopsPluginName}`], {
        stdio: "inherit",
      });
    } catch (error) {
    }
  });


export default { list, add, remove, update };