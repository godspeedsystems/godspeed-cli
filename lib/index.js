#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const figlet_1 = __importDefault(require("figlet"));
const commander_1 = __importDefault(require("commander"));
const path_1 = __importDefault(require("path"));
const simple_git_1 = __importDefault(require("simple-git"));
const child_process_1 = require("child_process");
const docker_compose_1 = __importDefault(require("docker-compose"));
const utils_1 = require("./utils");
const axios_1 = __importDefault(require("axios"));
const replace_in_file_1 = require("replace-in-file");
const ejs_1 = __importDefault(require("ejs"));
const glob_1 = __importDefault(require("glob"));
const fs_1 = __importDefault(require("fs"));
const terminal_colors_1 = __importDefault(require("./terminal_colors"));
let log = console.log.bind(console);
console.log = (...args) => {
    log(terminal_colors_1.default.FgYellow + args[0] + terminal_colors_1.default.Reset, args.length > 1 ? args.slice(1) : '');
};
console.error = (...args) => {
    log(terminal_colors_1.default.FgRed + args[0] + terminal_colors_1.default.Reset, args.length > 1 ? args.slice(1) : '');
};
const git = (0, simple_git_1.default)();
async function prepareContainers(projectName, gsServiceVersion, devcontainerDir, composeOptions, mongodb, postgresql) {
    // If mongoDb is selected then start mongoDb containers and set mongo cluster.
    if (mongodb) {
        console.log("Pulling mongodb...");
        // Start .devcontainer
        await docker_compose_1.default
            .upMany([`mongodb1`, `mongodb2`, `mongodb3`], composeOptions)
            .then(() => {
            console.log("mongodb containers started");
        }, (err) => {
            console.error("Error in starting mongodb containers:", err.message);
        });
        console.log("Creating replica set for mongodb");
        await docker_compose_1.default
            .exec(`mongodb1`, "bash /scripts/mongodb_rs_init.sh", composeOptions)
            .then(() => {
            console.log("Creating replica set is done for mongodb");
        }, (err) => {
            console.error("Error in creating replica set for mongodb:", err.message);
        });
    }
    console.log("Pulling framework Image...");
    const res = (0, child_process_1.execSync)(`docker pull adminmindgrep/gs_service:${gsServiceVersion}`);
    let commandOptions = [];
    console.log("Building framework Image...");
    await docker_compose_1.default
        .buildOne("node", {
        ...composeOptions,
        commandOptions
    })
        .then(() => { }, (err) => {
        console.error("Error in building container:", err.message);
    });
    if (mongodb || postgresql) {
        console.log("Generating prisma modules");
        await docker_compose_1.default
            .run("node", [
            "/bin/bash",
            "-c",
            "for i in src/datasources/*.prisma; do npx --yes prisma generate --schema $i && npx --yes prisma db push --schema $i; done",
        ], composeOptions)
            .then(() => {
            console.log("prisma modules generated");
        }, (err) => {
            console.error("Error in generating prisma clients:", err.message);
        });
    }
    // docker compose -p <projectname_devcontainer> stop
    await docker_compose_1.default
        .stop(composeOptions)
        .then(() => {
        console.log('"docker compose stop" done');
    }, (err) => {
        console.error('Error in "docker compose stop":', err.message);
    });
}
/*
 * function to update GS Project
 */
async function GSUpdate(composeOptions) {
    let gs;
    try {
        gs = JSON.parse(fs_1.default.readFileSync(path_1.default.join(process.cwd(), ".godspeed"), "utf-8"));
        const projectDir = process.cwd();
        const devcontainerDir = path_1.default.resolve(projectDir, ".devcontainer");
        let { projectName, mongodb, mongoDbName, postgresql, postgresDbName, kafka, elasticsearch, redis, userUID, svcPort, elasticsearchPort, postgresDbPort, zookeeperPort, kafkaPort, redisPort, mongoDb1Port, mongoDb2Port, mongoDb3Port, } = gs;
        composeOptions.cwd = devcontainerDir;
        composeOptions.composeOptions.push(`${projectName}_devcontainer`);
        try {
            if (!gs.mongodb) {
                mongodb = (0, utils_1.ask)("Do you need mongodb? [y/n] ");
                if (mongodb) {
                    mongoDbName =
                        (0, utils_1.prompt)("Please enter name of the mongo database [default: test] ") || "test";
                    mongoDb1Port = Number((0, utils_1.prompt)("Please enter host port for mongodb1 [default: 27017] ") ||
                        27017);
                    mongoDb2Port = Number((0, utils_1.prompt)("Please enter host port for mongodb2 [default: 27018] ") ||
                        27018);
                    mongoDb3Port = Number((0, utils_1.prompt)("Please enter host port for mongodb3 [default: 27019] ") ||
                        27019);
                }
            }
            if (!gs.postgresql) {
                postgresql = (0, utils_1.ask)("Do you need postgresdb? [y/n] ");
                if (postgresql) {
                    postgresDbName =
                        (0, utils_1.prompt)("Please enter name of the postgres database [default: test] ") || "test";
                    postgresDbPort = Number((0, utils_1.prompt)("Please enter host port for postgres [default: 5432] ") ||
                        5432);
                }
            }
            if (!gs.kafka) {
                kafka = (0, utils_1.ask)("Do you need kafka? [y/n] ");
                if (kafka) {
                    kafkaPort = Number((0, utils_1.prompt)("Please enter host port for kafka [default: 9092] ") || 9092);
                    zookeeperPort = Number((0, utils_1.prompt)("Please enter host port for zookeeper [default: 2181] ") ||
                        2181);
                }
            }
            if (!gs.elasticsearch) {
                elasticsearch = (0, utils_1.ask)("Do you need elastisearch? [y/n] ");
                if (elasticsearch) {
                    elasticsearchPort = Number((0, utils_1.prompt)("Please enter host port for elasticsearch [default: 9200] ") || 9200);
                }
            }
            if (!gs.redis) {
                redis = (0, utils_1.ask)("Do you need redis? [y/n] ");
                if (redis) {
                    redisPort = Number((0, utils_1.prompt)("Please enter host port for redis [default: 6379] ") || 6379);
                }
            }
            svcPort = Number((0, utils_1.prompt)(`Please enter host port on which you want to run your service [current: ${gs.svcPort}] `) || gs.svcPort);
            // Ask user about release version information of gs_service and change version in Dockerfile
            console.log("Fetching release version information...");
            const versions = await axios_1.default.get("https://registry.hub.docker.com/v2/namespaces/adminmindgrep/repositories/gs_service/tags?page_size=1024");
            const availableVersions = versions.data.results
                .map((s) => s.name)
                .join("\n");
            console.log(`Please select release version of gs_service from the available list:\n${availableVersions}`);
            const gsServiceVersion = (0, utils_1.prompt)("Enter your version [default: latest] ") || "latest";
            console.log(`Selected version ${gsServiceVersion}`);
            await (0, replace_in_file_1.replaceInFile)({
                files: devcontainerDir + "/Dockerfile",
                from: /adminmindgrep\/gs_service:.*/,
                to: `adminmindgrep/gs_service:${gsServiceVersion}`,
            });
            // Fetching UID information
            userUID = (0, utils_1.userID)();
            console.log("User ID is", userUID);
            // Create devcontainer.json file
            const devcontainerPath = path_1.default.resolve(devcontainerDir, "devcontainer.json.ejs");
            const devcontainerTemplate = ejs_1.default.compile(fs_1.default.readFileSync(devcontainerPath, "utf-8"));
            fs_1.default.writeFileSync(devcontainerPath.replace(".ejs", ""), devcontainerTemplate({ projectName, svcPort }));
            const dockerComposePath = path_1.default.resolve(devcontainerDir, "docker-compose.yml.ejs");
            const dockerComposeTemplate = ejs_1.default.compile(fs_1.default.readFileSync(dockerComposePath, "utf-8"));
            fs_1.default.writeFileSync(dockerComposePath.replace(".ejs", ""), dockerComposeTemplate({
                projectName,
                mongodb,
                mongoDbName,
                postgresql,
                postgresDbName,
                kafka,
                elasticsearch,
                redis,
                userUID,
                svcPort,
                elasticsearchPort,
                postgresDbPort,
                zookeeperPort,
                kafkaPort,
                redisPort,
                mongoDb1Port,
                mongoDb2Port,
                mongoDb3Port,
            }));
            const mongodbRsInitPath = path_1.default.join(devcontainerDir, "/scripts/mongodb_rs_init.sh.ejs");
            const mongodbRsInitPathTemplate = ejs_1.default.compile(fs_1.default.readFileSync(mongodbRsInitPath, "utf-8"));
            fs_1.default.writeFileSync(mongodbRsInitPath.replace(".ejs", ""), mongodbRsInitPathTemplate({ projectName, mongoDbName }), "utf-8");
            await (0, replace_in_file_1.replaceInFile)({
                files: devcontainerDir + "/scripts/*",
                from: /\r\n/g,
                to: "\n",
            });
            if (process.platform != 'win32') {
                const res = (0, child_process_1.execSync)(`chmod 755 ${devcontainerDir}/scripts/mongodb_init.sh ${devcontainerDir}/scripts/mongodb_rs_init.sh`);
            }
            // docker compose -p <projectname_devcontainer> down --remove-orphans
            await docker_compose_1.default
                .down({
                ...composeOptions,
                commandOptions: ["--remove-orphans"]
            })
                .then(() => {
                console.log('"docker compose down" done');
            }, (err) => {
                console.error('Error in "docker compose down":', err.message);
            });
            // // docker kill `docker ps -q`
            // await spawnSync('docker kill `docker ps -q`')
            await prepareContainers(projectName, gsServiceVersion, devcontainerDir, composeOptions, mongodb, postgresql);
            fs_1.default.writeFileSync(`.godspeed`, JSON.stringify({
                projectName,
                mongodb,
                mongoDbName,
                postgresql,
                postgresDbName,
                kafka,
                elasticsearch,
                redis,
                svcPort,
                elasticsearchPort,
                postgresDbPort,
                zookeeperPort,
                kafkaPort,
                redisPort,
                mongoDb1Port,
                mongoDb2Port,
                mongoDb3Port,
            }));
            console.log("\n", `godspeed update ${projectName} is done.`);
        }
        catch (ex) {
            console.error(ex.message);
            console.error("\n", `godspeed update ${projectName} is failed cleaning up...`);
        }
    }
    catch (ex) {
        console.error("Run update command from Project Root", ex);
        process.exit(1);
    }
}
/*
 * function to init GS Project
 * This function has below main steps:
 *   - Clone gs_project_template GIT repo into projectName
 *   - Create docker-compose.yml file after getting information from user by prompt (mongodb, postgresdb, elasticsearch, kafka, redis)
 */
async function GSCreate(projectName, options, composeOptions) {
    const projectDir = path_1.default.resolve(process.cwd(), projectName);
    const devcontainerDir = path_1.default.resolve(projectDir, ".devcontainer");
    composeOptions.cwd = devcontainerDir;
    composeOptions.composeOptions.push(`${projectName}_devcontainer`);
    console.log("projectDir: ", projectDir);
    if (fs_1.default.existsSync(projectName)) {
        let overwrite = (0, utils_1.ask)(`${projectName} exists do you want overwrite? [y/n] `);
        if (!overwrite) {
            console.error('Exiting without creating the project');
            process.exit(0);
        }
        fs_1.default.rmSync(projectName, { recursive: true, force: true });
    }
    if (!options.directory) {
        // Clone gs_project_template GIT repo
        const REPO = "https://github.com/Mindgreppers/gs_project_template.git";
        await git
            .clone(REPO, projectName)
            .then(() => {
            const p = require(path_1.default.resolve(process.cwd(), `${projectName}/package.json`));
            p.name = projectName;
            fs_1.default.writeFileSync(`${projectName}/package.json`, JSON.stringify(p, null, 2));
        })
            .then(() => console.log("project created"))
            .catch((err) => {
            console.error(err.message);
            process.exit(1);
        });
    }
    else {
        fs_1.default.cpSync(options.directory, projectDir, { recursive: true });
    }
    if (options.noexamples) {
        glob_1.default
            .sync(path_1.default.join(projectDir, "src/{datasources,functions,events,mappings}/*"))
            .map((f) => {
            fs_1.default.rmSync(f, { recursive: true, force: true });
        });
        // glob.sync(path.join(projectDir, 'src/{datasources,functions,events}/*')).map((f: string) => fs.unlinkSync(f));
    }
    try {
        const mongodb = (0, utils_1.ask)("Do you need mongodb? [y/n] ");
        let mongoDbName, mongoDb1Port, mongoDb2Port, mongoDb3Port;
        if (mongodb) {
            mongoDbName =
                (0, utils_1.prompt)("Please enter name of the mongo database [default: test] ") ||
                    "test";
            mongoDb1Port = Number((0, utils_1.prompt)("Please enter host port for mongodb1 [default: 27017] ") || 27017);
            mongoDb2Port = Number((0, utils_1.prompt)("Please enter host port for mongodb2 [default: 27018] ") || 27018);
            mongoDb3Port = Number((0, utils_1.prompt)("Please enter host port for mongodb3 [default: 27019] ") || 27019);
        }
        else {
            try {
                fs_1.default.rmSync(path_1.default.join(projectDir, "src/datasources/mongo.prisma"));
                fs_1.default.rmSync(path_1.default.join(projectDir, "src/functions/com/biz/ds/cross_db_join.yaml"));
                fs_1.default.rmSync(path_1.default.join(projectDir, "src/events/cross_db_join.yaml"));
            }
            catch (ex) { }
        }
        const postgresql = (0, utils_1.ask)("Do you need postgresdb? [y/n] ");
        let postgresDbName, postgresDbPort;
        if (postgresql) {
            postgresDbName =
                (0, utils_1.prompt)("Please enter name of the postgres database [default: test] ") ||
                    "test";
            postgresDbPort = Number((0, utils_1.prompt)("Please enter host port for postgres [default: 5432] ") || 5432);
        }
        else {
            try {
                fs_1.default.rmSync(path_1.default.join(projectDir, "src/datasources/postgres.prisma"));
                fs_1.default.rmSync(path_1.default.join(projectDir, "src/functions/com/biz/ds/cross_db_join.yaml"));
                fs_1.default.rmSync(path_1.default.join(projectDir, "src/events/cross_db_join.yaml"));
            }
            catch (ex) { }
        }
        if (!mongodb && !postgresql) {
            try {
                fs_1.default.rmSync(path_1.default.join(projectDir, "src/functions/com/biz/ds/create_user_then_show_all.yaml"));
                fs_1.default.rmSync(path_1.default.join(projectDir, "src/events/create_user_then_show_all.yaml"));
            }
            catch (ex) { }
        }
        const kafka = (0, utils_1.ask)("Do you need kafka? [y/n] ");
        let kafkaPort, zookeeperPort;
        if (kafka) {
            kafkaPort = Number((0, utils_1.prompt)("Please enter host port for kafka [default: 9092] ") || 9092);
            zookeeperPort = Number((0, utils_1.prompt)("Please enter host port for zookeeper [default: 2181] ") || 2181);
        }
        else {
            try {
                fs_1.default.rmSync(path_1.default.join(projectName, "src/datasources/kafka1.yaml"));
                fs_1.default.rmSync(path_1.default.join(projectName, "src/events/publish_kafka.yaml"));
                fs_1.default.rmSync(path_1.default.join(projectName, "src/functions/com/jfs/publish_kafka.yaml"));
            }
            catch (ex) { }
        }
        const elasticsearch = (0, utils_1.ask)("Do you need elastisearch? [y/n] ");
        let elasticsearchPort;
        if (elasticsearch) {
            elasticsearchPort = Number((0, utils_1.prompt)("Please enter host port for elasticsearch [default: 9200] ") ||
                9200);
        }
        else {
            try {
                fs_1.default.rmSync(path_1.default.join(projectDir, "src/datasources/eg_config/"), { recursive: true });
                fs_1.default.rmSync(path_1.default.join(projectDir, "src/datasources/elasticgraph.yaml"));
                fs_1.default.rmSync(path_1.default.join(projectDir, "src/functions/com/eg/eg_create.yaml"));
                fs_1.default.rmSync(path_1.default.join(projectDir, "src/functions/com/eg/eg_search.yaml"));
                fs_1.default.rmSync(path_1.default.join(projectDir, "src/events/eg_create.yaml"));
                fs_1.default.rmSync(path_1.default.join(projectDir, "src/events/eg_search.yaml"));
            }
            catch (ex) { }
        }
        const redis = (0, utils_1.ask)("Do you need redis? [y/n] ");
        let redisPort;
        if (redis) {
            redisPort = Number((0, utils_1.prompt)("Please enter host port for redis [default: 6379] ") || 6379);
        }
        const svcPort = Number((0, utils_1.prompt)("Please enter host port on which you want to run your service [default: 3000] ") || 3000);
        // Fetching UID information
        let userUID = (0, utils_1.userID)();
        console.log("User ID is", userUID);
        // Ask user about release version information of gs_service and change version in Dockerfile
        console.log("Fetching release version information...");
        const versions = await axios_1.default.get("https://registry.hub.docker.com/v2/namespaces/adminmindgrep/repositories/gs_service/tags?page_size=1024");
        const availableVersions = versions.data.results
            .map((s) => s.name)
            .join("\n");
        console.log(`Please select release version of gs_service from the available list:\n${availableVersions}`);
        const gsServiceVersion = (0, utils_1.prompt)("Enter your version [default: latest] ") || "latest";
        console.log(`Selected version ${gsServiceVersion}`);
        await (0, replace_in_file_1.replaceInFile)({
            files: devcontainerDir + "/Dockerfile",
            from: /adminmindgrep\/gs_service:.*/,
            to: `adminmindgrep/gs_service:${gsServiceVersion}`,
        });
        // Create devcontainer.json file
        const devcontainerPath = path_1.default.resolve(devcontainerDir, "devcontainer.json.ejs");
        const devcontainerTemplate = ejs_1.default.compile(fs_1.default.readFileSync(devcontainerPath, "utf-8"));
        fs_1.default.writeFileSync(devcontainerPath.replace(".ejs", ""), devcontainerTemplate({ projectName, svcPort }));
        const dockerComposePath = path_1.default.resolve(devcontainerDir, "docker-compose.yml.ejs");
        const dockerComposeTemplate = ejs_1.default.compile(fs_1.default.readFileSync(dockerComposePath, "utf-8"));
        fs_1.default.writeFileSync(dockerComposePath.replace(".ejs", ""), dockerComposeTemplate({
            projectName,
            mongodb,
            mongoDbName,
            postgresql,
            postgresDbName,
            kafka,
            elasticsearch,
            redis,
            userUID,
            svcPort,
            elasticsearchPort,
            postgresDbPort,
            zookeeperPort,
            kafkaPort,
            redisPort,
            mongoDb1Port,
            mongoDb2Port,
            mongoDb3Port,
        }));
        const mongodbRsInitPath = path_1.default.join(devcontainerDir, "/scripts/mongodb_rs_init.sh.ejs");
        const mongodbRsInitPathTemplate = ejs_1.default.compile(fs_1.default.readFileSync(mongodbRsInitPath, "utf-8"));
        fs_1.default.writeFileSync(mongodbRsInitPath.replace(".ejs", ""), mongodbRsInitPathTemplate({ projectName, mongoDbName }), "utf-8");
        await (0, replace_in_file_1.replaceInFile)({
            files: devcontainerDir + "/scripts/*",
            from: /\r\n/g,
            to: "\n",
        });
        // docker compose -p <projectname_devcontainer> down -v --remove-orphans
        await docker_compose_1.default
            .down({
            ...composeOptions,
            commandOptions: ["--remove-orphans", "-v"]
        })
            .then(() => {
            console.log('"docker compose down" done');
        }, (err) => {
            //console.log('Error in "docker compose down":', err.message);
        });
        // // docker kill `docker ps -q`
        // await spawnSync('docker kill `docker ps -q`')
        console.log('Preparing Containers...');
        await prepareContainers(projectName, gsServiceVersion, devcontainerDir, composeOptions, mongodb, postgresql);
        fs_1.default.writeFileSync(`${projectName}/.godspeed`, JSON.stringify({
            projectName,
            mongodb,
            mongoDbName,
            postgresql,
            postgresDbName,
            kafka,
            elasticsearch,
            redis,
            svcPort,
            elasticsearchPort,
            postgresDbPort,
            zookeeperPort,
            kafkaPort,
            redisPort,
            mongoDb1Port,
            mongoDb2Port,
            mongoDb3Port,
        }));
        console.log("\n", `godspeed create ${projectName} is done.`);
    }
    catch (ex) {
        console.error(ex.message);
        console.log("\n", `godspeed create ${projectName} is failed cleaning up...`);
        fs_1.default.rmSync(projectName, { recursive: true, force: true });
    }
}
async function changeVersion(version, composeOptions) {
    let gs;
    try {
        gs = JSON.parse(fs_1.default.readFileSync(path_1.default.join(process.cwd(), ".godspeed"), "utf-8"));
    }
    catch (ex) {
        console.error("Run version command from Project Root", ex);
        process.exit(1);
    }
    composeOptions.cwd = ".devcontainer";
    composeOptions.composeOptions.push(`${gs.projectName}_devcontainer`);
    (0, replace_in_file_1.replaceInFile)({
        files: ".devcontainer/Dockerfile",
        from: /adminmindgrep\/gs_service:.*/,
        to: `adminmindgrep/gs_service:${version}`,
    })
        .then(async (changedFiles) => {
        if (!changedFiles[0].hasChanged) {
            console.log(`Version Not changed to ${version}`);
        }
        else {
            try {
                await prepareContainers(gs.projectName, version, ".devcontainer", composeOptions, gs.mongodb, gs.postgresql);
            }
            catch (ex) {
                console.error("Run prepare command from Project Root", ex);
            }
            console.log(`Version changed to ${version}`);
        }
    })
        .catch((error) => {
        console.error("Error occurred:", error);
    });
}
/************************************************/
async function main() {
    console.log(chalk_1.default.green(figlet_1.default.textSync("godspeed", { horizontalLayout: "full" })));
    if (process.argv[2] == "prisma") {
        return (0, child_process_1.spawn)("npx", ["prisma"].concat(process.argv.slice(3)), {
            stdio: "inherit",
        });
    }
    let composeOptions = {};
    if (process.platform != 'win32') {
        let res;
        try {
            res = (0, child_process_1.execSync)(`docker-compose -v`, {
                stdio: ['pipe', 'pipe', 'ignore']
            });
        }
        catch (err) {
        }
        if (!res) {
            composeOptions = {
                executablePath: 'docker',
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
            executablePath: 'docker',
            log: true,
            composeOptions: ["compose", "-p"],
        };
    }
    commander_1.default
        .command("create <projectName>")
        .option("-n, --noexamples", "create blank project without examples")
        .option("-d, --directory <projectTemplateDir>", "local project template dir")
        .action((projectName, options) => {
        GSCreate(projectName, options, composeOptions);
    });
    commander_1.default.command("update").action(() => {
        GSUpdate(composeOptions);
    });
    commander_1.default.command("prisma").allowUnknownOption();
    commander_1.default
        .command("versions")
        .description("List all the available versions of gs_service")
        .action(() => {
        axios_1.default
            .get("https://registry.hub.docker.com/v2/namespaces/adminmindgrep/repositories/gs_service/tags?page_size=1024")
            .then((res) => {
            console.log(res.data.results.map((s) => s.name).join("\n"));
        })
            .catch((error) => {
            console.error(error);
        });
    });
    commander_1.default.command("version <version>").action((version) => {
        changeVersion(version, composeOptions);
    });
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
    const version = require("../package.json").version;
    commander_1.default.version(version, "-v, --version").parse(process.argv);
    if (process.argv.length < 3) {
        commander_1.default.help();
    }
}
main();
