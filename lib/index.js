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
const fs_1 = __importDefault(require("fs"));
const git = (0, simple_git_1.default)();
async function prepareContainers(projectName, projectDir, devcontainerDir, mongodb, postgresql) {
    // If mongoDb is selected then start mongoDb containers and set mongo cluster.
    if (mongodb) {
        // Start .devcontainer
        await docker_compose_1.default.upMany([`mongodb1`, `mongodb2`, `mongodb3`], { cwd: devcontainerDir, log: true, composeOptions: ["-p", `${projectName}_devcontainer`] })
            .then(() => { console.log('mongodb containers started'); }, err => { console.log('Error in starting mongodb containers:', err.message); });
        console.log('Creating replica set for mongodb');
        await docker_compose_1.default.exec(`mongodb1`, "bash /scripts/mongodb_rs_init.sh", { cwd: devcontainerDir, log: true, composeOptions: ["-p", `${projectName}_devcontainer`] })
            .then(() => { console.log('Creating replica set is done for mongodb'); }, err => { console.log('Error in creating replica set for mongodb:', err.message); });
    }
    if (mongodb || postgresql) {
        console.log('Generating prisma modules');
        await docker_compose_1.default.run('node', ['/bin/bash', '-c', "for i in src/datasources/*.prisma; do npx --yes prisma generate --schema $i && npx --yes prisma db push --schema $i; done"], { cwd: devcontainerDir, log: true, composeOptions: ["-p", `${projectName}_devcontainer`] })
            .then(() => { console.log('prisma modules generated'); }, err => { console.log('Error in generating prisma clients:', err.message); });
    }
    console.log('Installing godspeed');
    let commandOptions = [];
    if (process.platform == 'linux') {
        const cmd = (0, child_process_1.spawnSync)('id', ['-u']);
        const uid = cmd.stdout?.toString().trim();
        if (uid) {
            console.log('Setting container uid', uid);
            commandOptions = ['--build-arg', `USER_UID=${uid}`];
        }
    }
    await docker_compose_1.default.buildOne('node', { cwd: devcontainerDir, log: true, composeOptions: ["-p", `${projectName}_devcontainer`], commandOptions })
        .then(() => { }, err => { console.log('Error in building container:', err.message); });
    // await dockerCompose.run('node', ['/bin/bash','-c', 'sudo npm i -g @mindgrep/godspeed && godspeed'], { cwd: devcontainerDir, log: true, composeOptions: ["-p", `${projectName}_devcontainer`] })
    //   .then(
    //     () => { console.log('godspeed installed') },
    //     err => { console.log('Error in installing godspeed:', err.message) }
    //   );
}
/*
* function to init GS Project
* This function has below main steps:
*   - Clone gs_project_template GIT repo into projectName
*   - Create docker-compose.yml file after getting information from user by prompt (mongodb, postgresdb, elasticsearch, kafka, redis)
*/
async function GSCreate(projectName, options) {
    const projectDir = path_1.default.resolve(process.cwd(), projectName);
    const devcontainerDir = path_1.default.resolve(projectDir, '.devcontainer');
    console.log('projectDir: ', projectDir, 'projectTemplateDir', options.directory);
    if (!options.directory) {
        // Clone gs_project_template GIT repo
        const REPO = 'https://github.com/Mindgreppers/gs_project_template.git';
        await git.clone(REPO, projectName)
            .then(() => {
            const p = require(path_1.default.resolve(process.cwd(), `${projectName}/package.json`));
            p.name = projectName;
            fs_1.default.writeFileSync(`${projectName}/package.json`, JSON.stringify(p, null, 2));
        })
            .then(() => console.log('project created'))
            .catch((err) => {
            console.error(err.message);
            process.exit(1);
        });
    }
    else {
        if (fs_1.default.existsSync(projectName)) {
            let overwrite = (0, utils_1.ask)(`${projectName} exists do you want overwrite? [y/n] `);
            if (!overwrite) {
                process.exit(0);
            }
            fs_1.default.rmSync(projectName, { recursive: true, force: true });
        }
        fs_1.default.cpSync(options.directory, projectName, { recursive: true });
    }
    // Create devcontainer.json file
    const devcontainerPath = path_1.default.resolve(devcontainerDir, 'devcontainer.json.ejs');
    const devcontainerTemplate = ejs_1.default.compile(fs_1.default.readFileSync(devcontainerPath, 'utf-8'));
    fs_1.default.writeFileSync(devcontainerPath.replace('.ejs', ''), devcontainerTemplate({ projectName }));
    try {
        const mongodb = (0, utils_1.ask)('Do you need mongodb? [y/n] ');
        let mongoDbName;
        if (mongodb) {
            mongoDbName = (0, utils_1.prompt)('Please enter name of the mongo database [default: test] ') || 'test';
        }
        else {
            try {
                fs_1.default.rmSync(path_1.default.join(projectDir, 'src/datasources/mongo.prisma'));
                fs_1.default.rmSync(path_1.default.join(projectDir, 'src/functions/com/biz/ds/cross_db_join.yaml'));
                fs_1.default.rmSync(path_1.default.join(projectDir, 'src/events/cross_db_join.yaml'));
            }
            catch (ex) {
            }
        }
        const postgresql = (0, utils_1.ask)('Do you need postgresdb? [y/n] ');
        let postgresDbName;
        if (postgresql) {
            postgresDbName = (0, utils_1.prompt)('Please enter name of the postgres database [default: test] ') || 'test';
        }
        else {
            fs_1.default.rmSync(path_1.default.join(projectName, 'src/datasources/postgres.prisma'));
        }
        const kafka = (0, utils_1.ask)('Do you need kafka? [y/n] ');
        const elasticsearch = (0, utils_1.ask)('Do you need elastisearch? [y/n] ');
        const redis = false; //ask('Do you need redis? [y/n] ');
        const dockerComposePath = path_1.default.resolve(devcontainerDir, 'docker-compose.yml.ejs');
        const dockerComposeTemplate = ejs_1.default.compile(fs_1.default.readFileSync(dockerComposePath, 'utf-8'));
        fs_1.default.writeFileSync(dockerComposePath.replace('.ejs', ''), dockerComposeTemplate({
            projectName, mongodb, mongoDbName,
            postgresql, postgresDbName, kafka, elasticsearch, redis
        }));
        const mongodbRsInitPath = path_1.default.join(devcontainerDir, '/scripts/mongodb_rs_init.sh.ejs');
        const mongodbRsInitPathTemplate = ejs_1.default.compile(fs_1.default.readFileSync(mongodbRsInitPath, 'utf-8'));
        fs_1.default.writeFileSync(mongodbRsInitPath.replace('.ejs', ''), mongodbRsInitPathTemplate({ projectName, mongoDbName }), 'utf-8');
        // docker-compose -p <projectname_devcontainer> down -v --remove-orphans
        await docker_compose_1.default.down({ cwd: devcontainerDir, log: true, composeOptions: ["-p", `${projectName}_devcontainer`], commandOptions: ['--remove-orphans', '-v'] })
            .then(() => { console.log('"docker-compose down" done'); }, err => { console.log('Error in "docker-compose down":', err.message); });
        // // docker kill `docker ps -q`
        // await spawnSync('docker kill `docker ps -q`')
        await prepareContainers(projectName, projectName, devcontainerDir, mongodb, postgresql);
        // docker-compose -p <projectname_devcontainer> stop
        await docker_compose_1.default.stop({ cwd: devcontainerDir, log: true, composeOptions: ["-p", `${projectName}_devcontainer`] })
            .then(() => { console.log('"docker-compose stop" done'); }, err => { console.log('Error in "docker-compose stop":', err.message); });
        fs_1.default.writeFileSync(`${projectName}/.godspeed`, JSON.stringify({
            projectName,
            mongodb,
            postgresql,
            kafka,
            elasticsearch
        }));
        console.log('\n', `godspeed create ${projectName} is done.`);
    }
    catch (ex) {
        console.error(ex.message);
        console.log('\n', `godspeed create ${projectName} is failed cleaning up...`);
        fs_1.default.rmSync(projectName, { recursive: true, force: true });
    }
}
/************************************************/
async function main() {
    console.log(chalk_1.default.green(figlet_1.default.textSync('godspeed-cli', { horizontalLayout: 'full' })));
    if (process.argv[2] == 'prisma') {
        return (0, child_process_1.spawn)('npx', ['prisma'].concat(process.argv.slice(3)), {
            stdio: 'inherit'
        });
    }
    commander_1.default.command('create <projectName>').option('-d, --directory <projectTemplateDir>', 'local project template dir').action((projectName, options) => { GSCreate(projectName, options); });
    commander_1.default
        .command('prisma')
        .allowUnknownOption();
    commander_1.default.command('versions')
        .description('List all the available versions of gs_service')
        .action(() => {
        axios_1.default
            .get('https://registry.hub.docker.com/v1/repositories/adminmindgrep/gs_service/tags')
            .then(res => {
            console.log(res.data.map((s) => s.name).join('\n'));
        })
            .catch(error => {
            console.error(error);
        });
    });
    commander_1.default.command('prepare', 'prepare the containers, before launch or after cleaning the containers').action(async () => {
        try {
            const gs = JSON.parse(fs_1.default.readFileSync(path_1.default.join(process.cwd(), '.godspeed'), 'utf-8'));
            await prepareContainers(gs.projectName, '.', '.devcontainer', gs.mongodb, gs.postgresql);
        }
        catch (ex) {
            console.log('Run prepare command from Project Root');
        }
    });
    commander_1.default.command('version <version>').action((version) => {
        let gs;
        try {
            gs = JSON.parse(fs_1.default.readFileSync(path_1.default.join(process.cwd(), '.godspeed'), 'utf-8'));
        }
        catch (ex) {
            console.error('Run version command from Project Root', ex);
            process.exit(1);
        }
        (0, replace_in_file_1.replaceInFile)({
            files: '.devcontainer/Dockerfile',
            from: /adminmindgrep\/gs_service:.*/,
            to: `adminmindgrep/gs_service:${version}`,
        })
            .then(async (changedFiles) => {
            if (!changedFiles[0].hasChanged) {
                console.log(`Version Not changed to ${version}`);
            }
            else {
                try {
                    console.log('gs: ', gs);
                    await prepareContainers(gs.projectName, '.', '.devcontainer', gs.mongodb, gs.postgresql);
                }
                catch (ex) {
                    console.error('Run prepare command from Project Root', ex);
                }
                console.log(`Version changed to ${version}`);
            }
        })
            .catch((error) => {
            console.error('Error occurred:', error);
        });
    });
    commander_1.default
        .command('prisma')
        .allowUnknownOption();
    try {
        const scripts = require(path_1.default.resolve(process.cwd(), `package.json`)).scripts;
        for (let script in scripts) {
            commander_1.default
                .command(script)
                .allowUnknownOption()
                .addHelpText('after', `
  Will run:
    $ ${scripts[script]}`)
                .action(() => {
                (0, child_process_1.spawn)('npm', ['run'].concat(process.argv.slice(2)), {
                    stdio: 'inherit'
                });
            });
        }
    }
    catch (ex) {
    }
    const version = require('../package.json').version;
    commander_1.default.version(version).parse(process.argv);
}
main();
