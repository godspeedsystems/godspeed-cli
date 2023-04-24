#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const chalk_1 = __importDefault(require("chalk"));
const figlet_1 = __importDefault(require("figlet"));
const commander_1 = __importDefault(require("commander"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const axios_1 = __importDefault(require("axios"));
const create_1 = __importDefault(require("./commands/create"));
const update_1 = __importDefault(require("./commands/update"));
const version_1 = __importDefault(require("./commands/version"));
const terminal_colors_1 = __importDefault(require("./terminal_colors"));
// load .env
dotenv.config();
let log = console.log.bind(console);
console.log = (...args) => {
    log(terminal_colors_1.default.FgYellow + args[0] + terminal_colors_1.default.Reset, args.length > 1 ? args.slice(1) : "");
};
console.error = (...args) => {
    log(terminal_colors_1.default.FgRed + args[0] + terminal_colors_1.default.Reset, args.length > 1 ? args.slice(1) : "");
};
async function main() {
    console.log(chalk_1.default.green(figlet_1.default.textSync("godspeed", { horizontalLayout: "full" })));
    let composeOptions = {};
    if (process.platform != "win32") {
        let res;
        try {
            res = (0, child_process_1.execSync)(`docker-compose -v`, {
                stdio: ["pipe", "pipe", "ignore"],
            });
        }
        catch (err) { }
        if (!res) {
            composeOptions = {
                executablePath: "docker",
                log: true,
                composeOptions: ["compose", "-p"],
            };
        }
        else {
            composeOptions = {
                log: true,
                composeOptions: ["-p"],
            };
        }
    }
    else {
        composeOptions = {
            executablePath: "docker",
            log: true,
            composeOptions: ["compose", "-p"],
        };
    }
    // create
    commander_1.default
        .command("create <projectName>")
        .option("-n, --noexamples", "create blank project without examples")
        .option("-d, --directory <projectTemplateDir>", "local project template dir")
        .action((projectName, options) => {
        (0, create_1.default)(projectName, options);
    });
    // update
    commander_1.default.command("update").action(() => {
        (0, update_1.default)(composeOptions);
    });
    // prisma
    commander_1.default.command("prisma").allowUnknownOption();
    if (process.argv[2] == "prisma") {
        return (0, child_process_1.spawn)("npx", ["prisma"].concat(process.argv.slice(3)), {
            stdio: "inherit",
        });
    }
    // versions
    commander_1.default
        .command("versions")
        .description("list all the available versions of gs-node-service (Godspeed Framework) ")
        .action(() => {
        axios_1.default
            .get(`${process.env.DOCKER_REGISTRY_TAGS_VERSION_URL}`)
            .then((res) => {
            console.log(res.data.results.map((s) => s.name).join("\n"));
        })
            .catch((error) => {
            console.error(error);
        });
    });
    // version
    commander_1.default.command(" <version>").action((_v) => {
        // _v, renamed it because of collision with the function name
        (0, version_1.default)(_v, composeOptions);
    });
    // commands defined in scaffolding package.json
    try {
        const scripts = require(path_1.default.resolve(process.cwd(), `package.json`)).scripts;
        for (let script in scripts) {
            commander_1.default
                .command(script)
                .allowUnknownOption()
                .addHelpText("after", `
  Will run:
    $ ${scripts[script]}`)
                .action(() => {
                (0, child_process_1.spawn)("npm", ["run"].concat(process.argv.slice(2)), {
                    stdio: "inherit",
                });
            });
        }
    }
    catch (ex) { }
    // version
    const _version = require("../package.json").version;
    commander_1.default.version(_version, "-v, --version").parse(process.argv);
    // help
    if (process.argv.length < 3) {
        commander_1.default.help();
    }
}
main();
//# sourceMappingURL=index.js.map