#!/usr/bin/env node
import * as dotenv from "dotenv";
import chalk from "chalk";
import { Command } from "commander";
import create from "./commands/create/index";
// import update from "./commands/update/index";
import path from "path";
// import { spawn, spawnSync } from "child_process";
import spawnSync from "cross-spawn";
const os = require("os");
import devOpsPluginCommands from "./commands/devops-plugin";
import pluginCommands from "./commands/plugin";
import prismaCommands from "./commands/prisma";
import otelCommands from "./commands/otel";
import {genGraphqlSchema} from "./utils/index";
const fsExtras = require("fs-extra");
import { cwd } from "process";
import fs, { readFileSync } from "fs";
import { homedir } from "node:os";
import { readdir } from 'fs/promises';

import { globSync } from "glob";
import inquirer from "inquirer";

// load .env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// added a new ENV variable in docker-compose.yml
// const isInsideDevContainer = (): boolean => {
//   return !!process.env.INSIDE_CONTAINER;
// };

const detectOSType = () => {
  switch (process.platform) {
    case "win32":
      return "Windows";
    case "linux":
      return "Linux";
    case "darwin":
      return "Mac";
    default:
      return "UNKNOWN";
  }
};
export const isAGodspeedProject = () => {
  // verify .godspeed file, only then, it is a godspeed project
  try {
    readFileSync(path.join(cwd(), ".godspeed"));
  } catch (error) {
    console.log(
      `${chalk.yellow(cwd())} ${chalk.red(
        "is not a Godspeed Framework project."
      )}`
    );
    console.log(
      "\n",
      chalk.yellow("godspeed"),
      chalk.yellow("commands works inside godspeed project directory.")
    );
    return false;
  }

  let packageJSON;
  try {
    // @ts-ignore
    packageJSON = JSON.parse(
      readFileSync(path.join(cwd(), "package.json"), { encoding: "utf-8" })
    );
  } catch (error) {
    console.log(`This (${chalk.yellow(cwd())})`, "is not a Godspeed project.");
    console.log(
      "\n",
      chalk.yellow("godspeed"),
      chalk.yellow("commands only work inside godspeed project directory.")
    );
    return false;
  }

  return true;
};

const updateServicesJson = async (add = true) => {
  const servicesFile = path.join(os.homedir(), ".godspeed", "services.json");

  try {
    if (!fs.existsSync(servicesFile)) return;

    const servicesData = JSON.parse(fs.readFileSync(servicesFile, "utf-8"));
    const currentProject = {
      serviceId: path.basename(process.cwd()),
      name: path.basename(process.cwd()),
      path: process.cwd(),
      status: "active",
      last_updated: new Date().toISOString(),
      initialized: true,
    };

    if (add) {
      const exists = servicesData.services.some((service: any) => service.path === process.cwd());
      if (!exists) servicesData.services.push(currentProject);
    } else {
      servicesData.services = servicesData.services.filter((service: any) => service.path !== process.cwd());
    }

    await fs.promises.writeFile(servicesFile, JSON.stringify(servicesData, null, 2), "utf-8");
    console.log(chalk.green("Project data updated successfully."));
  } catch (error: any) {
    if (error.code === "EACCES") {
      const action = add ? "link" : "unlink";
      console.error("\x1b[31mPermission denied: Cannot write to services.json\x1b[0m");
      console.error(`\x1b[33mTry running: \x1b[1msudo godspeed ${action}\x1b[0m`);
    } else {
      console.error("\x1b[31mAn error occurred:\x1b[0m", error);
    }
  }
};

(async function main() {
  // console.log(chalk.bold(chalk.green("\n~~~~~~ Godspeed CLI ~~~~~~\n")));
  console.log("\n");
  console.log(
    chalk.white("       ,_,   ") +
      chalk.red.bold("╔════════════════════════════════════╗")
  );
  console.log(
    chalk.bold("      (o") +
      chalk.red.bold(",") +
      chalk.yellow.bold("o") +
      chalk.bold(")  ") +
      chalk.red.bold("║") +
      chalk.yellow.bold("        Welcome to Godspeed         ") +
      chalk.red.bold("║")
  );
  console.log(
    chalk.blue("     ({___}) ") +
      chalk.red.bold("║") +
      chalk.yellow.bold("    World's First Meta Framework    ") +
      chalk.red.bold("║")
  );
  console.log(
    chalk.bold('       " "   ') +
      chalk.red.bold("╚════════════════════════════════════╝")
  );
  console.log("\n");
  //checking installed version
  // const currentVersion = execSync('npm list -g @godspeedsystems/godspeed --json').toString();
  // const parsedVersion = JSON.parse(currentVersion);
  // const installedVersion = parsedVersion.dependencies["@godspeedsystems/godspeed"].version

  // //checking latest from npm version
  // const metadata = await pacote.manifest("@godspeedsystems/godspeed");
  // const latestversion = metadata.version;

  // if (latestversion !== installedVersion) {
  //   console.log(chalk.yellow.bold(`\nWarning: A new version of the godspeed is available (${latestversion}). Update using:`));
  //   console.log(chalk.cyan.bold('  npm i -g @godspeedsystems/godspeed\n'));
  // }

  const program = new Command();

  // @ts-ignore
  let { version, homepage } = require(path.join(__dirname, "../package.json"));

  // remove @godspeedsystems from the name
  program
    .name("Godspeed CLI")
    .description("CLI tool for godspeed framework.")
    .version(version);
  program.showHelpAfterError();
  program.showSuggestionAfterError(true);
  program.allowUnknownOption();
  program.allowExcessArguments();
  program.configureOutput({
    writeOut: (str) => {
      console.log(`${str}\n`);
      console.log(`For detailed documentation visit ${homepage}`);
      console.log(`\n`);
    },
    outputError: (str, write) => {
      write(chalk.red(str));
    },
  });

  program
    .command("create")
    .description("create a new godspeed project.")
    .argument("<projectName>", "name of the project.")
    .option(
      "--from-template <projectTemplateName>",
      "create a project from a template."
    )
    .option("--from-example <exampleName>", "create a project from examples.")
    .action((projectName, options) => {
      create(projectName, options, version);
    });

  // program
  //   .command("update")
  //   .description(
  //     "Update existing godspeed project. (execute from project root folder)"
  //   )
  //   .action(async (options) => {
  //     if (await isAGodspeedProject()) {
  //       update(options, version);
  //     }
  //   });


  program
    .command("dev")
    .description("run godspeed development server.")
    .action(async () => {
      if (await isAGodspeedProject()) {
        spawnSync("npm", ["run", "dev"], {
          stdio: "inherit",
        });
      }
    });

  program
    .command("clean")
    .description(`clean the previous build.`)
    .action(async (options) => {
      if (isAGodspeedProject()) {
        spawnSync("npm", ["run", "clean"], {
          stdio: "inherit",
        });
      }
    });

    program
    .command("link")
    .description("Link a local Godspeed project to the global environment for development in godspeed-daemon.")
    .action(async () => {
      if (await isAGodspeedProject()) {
        updateServicesJson(true);
      }
    });
  
  program
    .command("unlink")
    .description("Unlink a local Godspeed project from the global environment.")
    .action(async() => {
      if (await isAGodspeedProject()) {
        updateServicesJson(false);
      }
    });

  program
    .command("gen-crud-api")
    .description(
      "scans your prisma datasources and generate CRUD APIs events and workflows"
    )
    .action(async () => {
      if (isAGodspeedProject()) {
        spawnSync("npm", ["run", "gen-crud-api"], { stdio: "inherit" });
      }
    });
    program
    .command("gen-graphql-schema")
    .description(
      "scans your graphql events and generate graphql schema"
    )
    .action(async () => {
      if (isAGodspeedProject()) {
        await genGraphqlSchema()
      }
    });
  program
    .command("build")
    .description("build the godspeed project. create a production build.")
    .action(async (options) => {
      if (await isAGodspeedProject()) {
        spawnSync("npm", ["run", "build"], {
          stdio: "inherit",
          env: {
            // NODE_ENV: "production",
            ...process.env,
          },
        });
      }
    });
  program
    .command("preview")
    .description("preview the production build.")
    .action(async (options) => {
      if (await isAGodspeedProject()) {
        spawnSync("npm", ["run", "preview"], {
          stdio: "inherit",
          env: {
            // NODE_ENV: "production",
            ...process.env,
          },
        });
      }
    });

  // fetch the list of installed devops-plugins
  const pluginPath = path.resolve(homedir(), `.godspeed/devops-plugins/node_modules/@godspeedsystems/`);

  const devopsPluginSubCommand = program.command('devops-plugin')
    .description(`manages godspeed devops-plugins.`)

  devopsPluginSubCommand
    .addCommand(devOpsPluginCommands.install);

  devopsPluginSubCommand
    .addCommand(devOpsPluginCommands.list);    
  
  devopsPluginSubCommand
    .addCommand(devOpsPluginCommands.remove);
  
  devopsPluginSubCommand
    .addCommand(devOpsPluginCommands.update);  

  const devopsPluginHelp = `
  To see help for any installed devops plugin, you can run:
  <plugin-name> help
  `;
  devopsPluginSubCommand.on('--help', () => {
    console.log(devopsPluginHelp);
  });

  //check if devops-plugin is installed.
  if (fs.existsSync(pluginPath)) {
    const installedPlugins = await readdir(pluginPath);
    for (const installedPluginName of installedPlugins) {
      devopsPluginSubCommand
        .command(`${installedPluginName}`)
        .description("installed godspeed devops plugin")
        .allowUnknownOption(true)
        .action(async () => {
          const installedPluginPath = path.resolve(pluginPath, installedPluginName, "dist/index.js");

          // check if installedPluginPath exists.
          if (!fs.existsSync(installedPluginPath)) {
            console.error(`${installedPluginName} is not installed properly. Please make sure ${installedPluginPath} exists.`);
            return;
          }

          const args = process.argv.slice(4);

          // Spawn the plugin with all arguments and options
          spawnSync('node', [installedPluginPath, ...args], {
            stdio: 'inherit',
          });
        });
    }
  }
  program
    .command("serve")
    .description("build and preview the production build in watch mode.")
    .action(async (options) => {
      if (await isAGodspeedProject()) {
        spawnSync("npm", ["run", "serve"], {
          stdio: "inherit",
          env: {
            // NODE_ENV: "production",
            ...process.env,
          },
        });
      }
    });

  program
    .command("plugin")
    .addCommand(pluginCommands.add)
    .addCommand(pluginCommands.remove)
    .addCommand(pluginCommands.update)
    .description(
      `manage(add, remove, update) eventsource and datasource plugins for godspeed.`
    );

  // bypass all conmmands to prisma CLI, except godspeed prepare
  if (process.argv[2] === "prisma") {
    if (process.argv[3] !== "prepare") {
      spawnSync("npx", ["prisma"].concat(process.argv.slice(3)));
    }
  }

  program
    .command("prisma")
    .description(
      "proxy to prisma commands with some add-on commands to handle prisma datasources."
    )
    .addCommand(prismaCommands.prepare);

  program
    .command("otel")
    .addCommand(otelCommands.enable)
    .addCommand(otelCommands.disable)
    .description("enable/disable Observability in Godspeed.");

  program.parse();
})();
