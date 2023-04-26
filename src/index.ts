#!/usr/bin/env node
import * as dotenv from "dotenv";
import chalk from "chalk";
import figlet from "figlet";
import program from "commander";
import path from "path";
import { execSync, spawn } from "child_process";
import { PlainObject } from "./common";
import create from "./commands/create";
import update from "./commands/update";
import version from "./commands/version";
import terminalColors from "./terminal_colors";
import versions from "./commands/versions";

// load .env
dotenv.config();

let log = console.log.bind(console);

console.log = (...args) => {
  log(
    terminalColors.FgYellow + args[0] + terminalColors.Reset,
    args.length > 1 ? args.slice(1) : ""
  );
};

console.error = (...args) => {
  log(
    terminalColors.FgRed + args[0] + terminalColors.Reset,
    args.length > 1 ? args.slice(1) : ""
  );
};

async function main() {
  console.log(
    chalk.green(figlet.textSync("godspeed", { horizontalLayout: "full" }))
  );

  let composeOptions: PlainObject = {};
  if (process.platform != "win32") {
    let res;
    try {
      res = execSync(`docker-compose -v`, {
        stdio: ["pipe", "pipe", "ignore"],
      });
    } catch (err) {}

    if (!res) {
      composeOptions = {
        executablePath: "docker",
        log: true,
        composeOptions: ["compose", "-p"],
      };
    } else {
      composeOptions = {
        log: true,
        composeOptions: ["-p"],
      };
    }
  } else {
    composeOptions = {
      executablePath: "docker",
      log: true,
      composeOptions: ["compose", "-p"],
    };
  }

  // create
  program
    .command("create <projectName>")
    .option("-n, --noexamples", "create blank project without examples")
    .option(
      "-d, --directory <projectTemplateDir>",
      "local project template dir"
    )
    .action((projectName, options) => {
      create(projectName, options, composeOptions);
    });

  // update
  program.command("update").action(() => {
    update(composeOptions);
  });

  // prisma
  program.command("prisma").allowUnknownOption();
  if (process.argv[2] == "prisma") {
    return spawn("npx", ["prisma"].concat(process.argv.slice(3)), {
      stdio: "inherit",
    });
  }

  // versions
  program
    .command("versions")
    .description(
      "list all the available versions of gs-node-service (Godspeed Framework) "
    )
    .action(() => {
      versions();
    });

  // version
  program.command(" <version>").action((_v) => {
    // _v, renamed it because of collision with the function name
    version(_v, composeOptions);
  });

  // commands defined in scaffolding package.json
  try {
    const scripts = require(path.resolve(
      process.cwd(),
      `package.json`
    )).scripts;

    for (let script in scripts) {
      program
        .command(script)
        .allowUnknownOption()
        .addHelpText(
          "after",
          `
  Will run:
    $ ${scripts[script]}`
        )
        .action(() => {
          spawn("npm", ["run"].concat(process.argv.slice(2)), {
            stdio: "inherit",
          });
        });
    }
  } catch (ex) {}

  // version
  const _version = require("../package.json").version;
  program.version(_version, "-v, --version").parse(process.argv);

  // help
  if (process.argv.length < 3) {
    program.help();
  }
}

main();
