#!/usr/bin/env node

import * as dotenv from "dotenv";
import chalk from "chalk";
import { Command } from "commander";
import create from "./commands/create/index";
import update from "./commands/update/index";
import path from "path";
import { spawn } from "child_process";
import devOpsPluginCommands from "./commands/devops-plugin";
import pluginCommands from "./commands/plugin";
const fsExtras = require("fs-extra");
import demo from './utils/demo';


// load .env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// added a new ENV variable in docker-compose.yml
const isInsideDevContainer = (): boolean => {
  return !!process.env.INSIDE_CONTAINER;
};

(async function main() {
  console.log(chalk.bold(chalk.green("\n~~~~~~ Godspeed CLI ~~~~~~\n")));

  const program = new Command();
  const { name, description, version } = require("../package.json");

  // remove @godspeedsystems from the name
  program.name(name.split("/")[1]).description(description).version(version);
  program.showHelpAfterError();
  program.showSuggestionAfterError(true);
  program.configureOutput({
    outputError: (str, write) => {
      write(chalk.red(str));
    },
  });

  program
    .command("create")
    .description("Create a new Godspeed project.")
    .argument("<projectName>", "name of the project.")
    .option(
      "--from-template <projectTemplateName>",
      "create a project from a template."
    )
    .option("--from-example <exampleName>", "create a project from examples.")
    .action((projectName, options) => {
      create(projectName, options, version);
    });

  program
    .command("update")
    .description(
      "Update existing godspeed project. (execute from project root folder)"
    )
    .action((options) => {
      update(options, version);
    });

  // commands defined in scaffolding package.json
  // TODO: We should add known commands to the program itself

  let scripts: PlainObject;
  try {
    scripts = require(path.resolve(process.cwd(), `package.json`)).scripts;
  } catch (error) {
    console.log('Error accessing process', error)
  }

  program
    .command("dev")
    .description("Run the godspeeds development server. [devcontainer only]")
    .action(() => {
      if (isInsideDevContainer()) {
        spawn("npm", ["run", "dev"], {
          stdio: "inherit",
        });
      } else {
        console.log(
          chalk.red("This command is supposed to run inside dev container.")
        );
      }
    });

  program
    .command("clean")
    .description(
      `Clean the build directory. ${chalk.yellow("[devcontainer only]")}`
    )
    .action((options) => {
      if (isInsideDevContainer()) {
        spawn("npm", ["run", "clean"], {
          stdio: "inherit",
        });
      } else {
        console.log(
          chalk.red("This command is supposed to run inside dev container.")
        );
      }
    });

  program
    .command("build")
    .description("Build the godspeed project. [devocintainer only]")
    .action((options) => {
      if (isInsideDevContainer()) {
        spawn("npm", ["run", "build"], {
          stdio: "inherit",
        });
      } else {
        console.log(
          chalk.red("This command is supposed to run inside dev container.")
        );
      }
    });


  program
    .command('devops-plugin')
    .addCommand(devOpsPluginCommands.list)
    .addCommand(devOpsPluginCommands.add)
    .addCommand(devOpsPluginCommands.remove)
    .addCommand(devOpsPluginCommands.update)
    .description(
      `Godspeed plugins for devops`
    );

  program
    .command('plugin')
    .addCommand(pluginCommands.list)
    .addCommand(pluginCommands.add)
    .addCommand(pluginCommands.remove)
    .addCommand(pluginCommands.update)
    .description(
      `Godspeed plugins for devops`
    );

  program.command('demo')
    .action(async () => {
      console.log('demo');
      await demo();
    });

  program.parse();
})();
