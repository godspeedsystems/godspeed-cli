import { Command } from "commander";
import path from "path";
import { homedir } from "node:os";
import fs, { readFileSync } from "fs";
import { spawnSync } from "child_process";
const program = new Command();

const list = program
  .command("list")
  .description(`List all available godspeed devops plugins.`)
  .action(() => {
    const gsDevopsPluginsDir = path.join(
      homedir(),
      ".godspeed",
      "devops-plugins"
    );
    const packageJsonPath = path.join(gsDevopsPluginsDir, "package.json");

    // Check if the directory exists, and create it if it doesn't
    if (!fs.existsSync(gsDevopsPluginsDir)) {
      fs.mkdirSync(gsDevopsPluginsDir, { recursive: true });
    }

    // Check if the package.json file exists, and create it with an empty object if it doesn't
    if (!fs.existsSync(packageJsonPath)) {
      fs.writeFileSync(packageJsonPath, "{}");
    }

    const dependencies =
      JSON.parse(
        fs.readFileSync(packageJsonPath, {
          encoding: "utf-8",
        })
      ).dependencies || {};

    console.log("dependency", dependencies);
  });

const add = program
  .command("add")
  .description(`Add a godspeed devops plugin.`)
  .argument("<devopsPluginName>", "name of the devops plugin.")
  .action(async (devopsPluginName) => {
    try {
      const gsDevopsPluginsDir = path.join(
        homedir(),
        ".godspeed",
        "devops-plugins"
      );

      if (!fs.existsSync(gsDevopsPluginsDir)) {
        fs.mkdirSync(gsDevopsPluginsDir, { recursive: true });
      }

      // Change the working directory to the plugin directory
      process.chdir(gsDevopsPluginsDir);

      // npm install in the plugin directory
      const npmInstallResult = spawnSync("npm", ["i", `${devopsPluginName}`], {
        stdio: "inherit",
      });

      if (npmInstallResult.error) {
        console.error("Error installing the plugin:", npmInstallResult.error);
      } else {
        console.log(`${devopsPluginName} installed successfully.`);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  });

const remove = program
  .command("remove")
  .argument("<devopsPluginName>", "name of the devops plugin.")
  .description(`Remove a godspeed devops plugin.`)
  .action(async (devopsPluginName) => {
    try {
      const gsDevopsPluginsDir = path.join(
        homedir(),
        ".godspeed",
        "devops-plugins"
      );
      const pluginDir = path.join(
        gsDevopsPluginsDir,
        "node_modules",
        devopsPluginName
      );

      // Check if the plugin directory exists
      if (!fs.existsSync(pluginDir)) {
        console.error(`Plugin '${devopsPluginName}' is not installed.`);
        return;
      }

      // Change the working directory to the plugin directory
      process.chdir(pluginDir);

      // npm uninstall in the plugin directory
      const npmUninstallResult = spawnSync(
        "npm",
        ["uninstall", `${devopsPluginName}`],
        {
          stdio: "inherit",
        }
      );

      if (npmUninstallResult.error) {
        console.error(
          "Error uninstalling the plugin:",
          npmUninstallResult.error
        );
      } else {
        console.log(`${devopsPluginName} uninstalled successfully.`);

        // Now, remove the dependency from the main package.json file
        const packageJsonPath = path.join(gsDevopsPluginsDir, "package.json");
        const packageJsonContent = JSON.parse(
          fs.readFileSync(packageJsonPath, "utf-8")
        );

        delete packageJsonContent.dependencies[devopsPluginName];

        fs.writeFileSync(
          packageJsonPath,
          JSON.stringify(packageJsonContent, null, 2)
        );

        console.log(`Removed '${devopsPluginName}' from the dependencies.`);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  });

const update = program
  .command("update")
  .argument("<devopsPluginName>", "name of the devops plugin.")
  .description(`Update a godspeed devops plugin.`)
  .action(async (devopsPluginName) => {
    try {
      const gsDevopsPluginsDir = path.join(
        homedir(),
        ".godspeed",
        "devops-plugins"
      );

      // npm update pluginName
      spawnSync("npm", ["update", `${devopsPluginName}`], {
        stdio: "inherit",
        cwd: gsDevopsPluginsDir, // Set the current working directory to the plugins directory
      });

      // Update the version in the main package.json file
      const packageJsonPath = path.join(gsDevopsPluginsDir, "package.json");
      const packageJsonContent = JSON.parse(
        fs.readFileSync(packageJsonPath, "utf-8")
      );

      // Update the version of the plugin in the dependencies
      if (packageJsonContent.dependencies[devopsPluginName]) {
        const pluginVersion = require(path.join(
          gsDevopsPluginsDir,
          "node_modules",
          devopsPluginName,
          "package.json"
        )).version;
        packageJsonContent.dependencies[devopsPluginName] = pluginVersion;

        fs.writeFileSync(
          packageJsonPath,
          JSON.stringify(packageJsonContent, null, 2)
        );
        console.log(
          `Updated '${devopsPluginName}' to version ${pluginVersion}.`
        );
      }
    } catch (error) {
      console.error("Error:", error);
    }
  });

export default { list, add, remove, update };
