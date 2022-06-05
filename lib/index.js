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
const dockerCompose_1 = __importDefault(require("./dockerCompose"));
const devContainerJson_1 = __importDefault(require("./devContainerJson"));
const mongodb_rs_init_1 = __importDefault(require("./mongodb_rs_init"));
const git = (0, simple_git_1.default)();
/*
* function to init GS Project
* This function has below main steps:
*   - Clone gs_project_template GIT repo into projectName
*   - Create docker-compose.yml file after getting information from user by prompt (mongodb, postgresdb, elasticsearch, kafka, redis)
*/
async function GSInit(projectName) {
    const projectDir = path_1.default.resolve(process.cwd(), projectName);
    const devcontainerDir = path_1.default.resolve(projectDir, '.devcontainer');
    console.log('projectDir: ', projectDir);
    // Clone gs_project_template GIT repo
    const REPO = 'https://github.com/Mindgreppers/gs_project_template.git';
    await git.clone(REPO, projectName)
        .then(() => console.log('project created'))
        .catch((err) => {
        console.error('error in project creation, not able to clone repo. Error Message: ', err);
        process.exit(1);
    });
    //Set permissions of mongo-keyfile to 0600 to avoid "Unable to acquire security key[s]" in mongodb
    await (0, child_process_1.exec)(`chmod 0600 ${devcontainerDir}/mongo-keyfile`, (error) => {
        if (error) {
            console.log(`error in setting permissions of ${devcontainerDir}/mongo-keyfile: ${error.message}`);
            return;
        }
    });
    // Create devcontainer.json file  
    (0, devContainerJson_1.default)(projectName, devcontainerDir);
    // Create docker-compose.yml file  
    (0, dockerCompose_1.default)(projectName, devcontainerDir);
    // Create mongodb_rs_init.sh file  
    (0, mongodb_rs_init_1.default)(projectName, devcontainerDir);
    // Start .devcontainer
    await docker_compose_1.default.upAll({ cwd: devcontainerDir, log: true, composeOptions: ["-p", `${projectName}_devcontainer`] })
        .then(() => { console.log('"docker-compose up -d" done'); }, err => { console.log('Error in "docker-compose up -d":', err.message); });
    // Execute Mongodb user creation scripts if mongodb container is present
    const res = await docker_compose_1.default.ps({ cwd: devcontainerDir, log: true, composeOptions: ["-p", `${projectName}_devcontainer`] });
    if (res.out.includes('mongodb1')) {
        console.log('Creating replica set for mongodb');
        await docker_compose_1.default.exec(`${projectName}_mongodb1`, "bash /scripts/mongodb_rs_init.sh", { cwd: devcontainerDir, log: true, composeOptions: ["-p", `${projectName}_devcontainer`] });
    }
    // Stop .devcontainer
    // await dockerCompose.down({ cwd: devcontainerDir, log: true })
    //   .then(
    //     () => { console.log('"docker-compose down" done')},
    //     err => { console.log('Error in "docker-compose down":', err.message)}
    //   );
    console.log('\n', 'godspeed --init <projectName> is done.');
}
/*
* function to build GS project
*/
function GSBuild() {
    console.log('This is GSBuild.');
    (0, child_process_1.exec)(`npm run build`, (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });
}
/************************************************/
async function main() {
    console.log(chalk_1.default.red(figlet_1.default.textSync('godspeed-cli', { horizontalLayout: 'full' })));
    commander_1.default
        .version('1.0')
        .description("Godspeed CLI")
        .option('-b, --build', 'To build the project')
        .option('-i, --init <projectName>', 'To initialize a project')
        .parse(process.argv);
    const options = commander_1.default.opts();
    if (!process.argv.slice(2).length) {
        commander_1.default.outputHelp();
    }
    // build option
    if (options.build) {
        GSBuild();
    }
    // init option
    if (options.init) {
        const projectName = options.init;
        GSInit(projectName);
    }
}
main();
