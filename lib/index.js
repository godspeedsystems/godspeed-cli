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
const fs_1 = __importDefault(require("fs"));
const handlebars_1 = __importDefault(require("handlebars"));
const git = (0, simple_git_1.default)();
/*
* function to init GS Project
* This function has below main steps:
*   - Clone gs_project_template GIT repo into projectName
*   - Create docker-compose.yml file after getting information from user by prompt (mongodb, postgresdb, elasticsearch, kafka, redis)
*/
async function GSCreate(projectName) {
    const projectDir = path_1.default.resolve(process.cwd(), projectName);
    const devcontainerDir = path_1.default.resolve(projectDir, '.devcontainer');
    console.log('projectDir: ', projectDir);
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
        console.error('error in project creation, not able to clone repo. Error Message: ', err);
        process.exit(1);
    });
    // Create devcontainer.json file
    const devcontainerPath = path_1.default.resolve(devcontainerDir, 'devcontainer.json.hbs');
    const devcontainerTemplate = handlebars_1.default.compile(fs_1.default.readFileSync(devcontainerPath, 'utf-8'), { noEscape: true });
    fs_1.default.writeFileSync(devcontainerPath.replace('.hbs', ''), devcontainerTemplate({ projectName }, { helpers: { json: JSON.stringify } }));
    const mongodb = (0, utils_1.ask)('Do you need mongodb? [y/n] ');
    let mongoDbName;
    if (mongodb) {
        mongoDbName = (0, utils_1.prompt)('Please enter name of the mongo database [default: test] ') || 'test';
    }
    const postgresql = (0, utils_1.ask)('Do you need postgresdb? [y/n] ');
    let postgresDbName;
    if (postgresql) {
        postgresDbName = (0, utils_1.prompt)('Please enter name of the postgres database [default: test] ') || 'test';
    }
    const kafka = (0, utils_1.ask)('Do you need kafka? [y/n] ');
    const elastisearch = (0, utils_1.ask)('Do you need elastisearch? [y/n] ');
    const redis = true; //ask('Do you need redis? [y/n] ');
    const dockerComposePath = path_1.default.resolve(devcontainerDir, 'docker-compose.yml.hbs');
    const dockerComposeTemplate = handlebars_1.default.compile(fs_1.default.readFileSync(dockerComposePath, 'utf-8'), { noEscape: true });
    fs_1.default.writeFileSync(dockerComposePath.replace('.hbs', ''), dockerComposeTemplate({ projectName, mongodb, mongoDbName,
        postgresql, postgresDbName, kafka, elastisearch, redis }, { helpers: { json: JSON.stringify } }));
    const mongodbRsInitPath = path_1.default.join(devcontainerDir, '/scripts/mongodb_rs_init.sh.hbs');
    const mongodbRsInitPathTemplate = handlebars_1.default.compile(fs_1.default.readFileSync(mongodbRsInitPath, 'utf-8'), { noEscape: true });
    fs_1.default.writeFileSync(mongodbRsInitPath.replace('.hbs', ''), mongodbRsInitPathTemplate({ projectName }, { helpers: { json: JSON.stringify } }));
    // If mongoDb is selected then start mongoDb containers and set mongo cluster. 
    if (mongodb) {
        // Start .devcontainer
        await docker_compose_1.default.upMany([`${projectName}_mongodb1`, `${projectName}_mongodb2`, `${projectName}_mongodb3`], { cwd: devcontainerDir, log: true, composeOptions: ["-p", `${projectName}_devcontainer`] })
            .then(() => { console.log('mongodb containers started'); }, err => { console.log('Error in starting mongodb containers:', err.message); });
        console.log('Creating replica set for mongodb');
        await docker_compose_1.default.exec(`${projectName}_mongodb1`, "bash /scripts/mongodb_rs_init.sh", { cwd: devcontainerDir, log: true, composeOptions: ["-p", `${projectName}_devcontainer`] })
            .then(() => { console.log('Creating replica set is done for mongodb'); }, err => { console.log('Error in creating replica set for mongodb:', err.message); });
        // Stop .devcontainer
        await docker_compose_1.default.stop({ cwd: devcontainerDir, log: true, composeOptions: ["-p", `${projectName}_devcontainer`] })
            .then(() => { console.log('"docker-compose stop" done'); }, err => { console.log('Error in "docker-compose stop":', err.message); });
    }
    console.log('\n', `godspeed create ${projectName} is done.`);
}
/************************************************/
async function main() {
    console.log(chalk_1.default.red(figlet_1.default.textSync('godspeed-cli', { horizontalLayout: 'full' })));
    if (process.argv[2] == 'prisma') {
        return (0, child_process_1.spawn)('npx', ['prisma'].concat(process.argv.slice(3)), {
            stdio: 'inherit'
        });
    }
    commander_1.default.command('create <projectName>').action((projectName) => { GSCreate(projectName); });
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
