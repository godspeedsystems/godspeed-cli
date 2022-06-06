#!/usr/bin/env node
import chalk from 'chalk';
import figlet from 'figlet';
import program from 'commander';
import path from 'path';
import simpleGit from 'simple-git';
import { exec, execSync } from 'child_process';
import dockerCompose from 'docker-compose';
import { createDockerCompose } from './dockerCompose';
import createDevContainerJson from './devContainerJson';
import createMongodbRsInit from './mongodb_rs_init';

const git = simpleGit();

/*
* function to init GS Project
* This function has below main steps:
*   - Clone gs_project_template GIT repo into projectName
*   - Create docker-compose.yml file after getting information from user by prompt (mongodb, postgresdb, elasticsearch, kafka, redis)
*/
async function GSCreate(projectName: string) {
  const projectDir = path.resolve(process.cwd(), projectName);
  const devcontainerDir = path.resolve(projectDir, '.devcontainer');
  console.log('projectDir: ',projectDir);

  // Clone gs_project_template GIT repo
  const REPO = 'https://github.com/Mindgreppers/gs_project_template.git';
  await git.clone(REPO, projectName)
    .then(() => console.log('project created'))
    .catch((err) => { 
      console.error('error in project creation, not able to clone repo. Error Message: ', err);
      process.exit(1);  
    });

  //Set permissions of mongo-keyfile to 0600 to avoid "Unable to acquire security key[s]" in mongodb
  const execRes = execSync(`chmod 0600 ${devcontainerDir}/scripts/mongo-keyfile`);

  // Create devcontainer.json file  
  createDevContainerJson(projectName, devcontainerDir);

  // Create docker-compose.yml file  
  createDockerCompose(projectName, devcontainerDir);

  // Create mongodb_rs_init.sh file  
  createMongodbRsInit(projectName, devcontainerDir);

  // Start .devcontainer
  await dockerCompose.upAll({ cwd: devcontainerDir, log: true, composeOptions: ["-p", `${projectName}_devcontainer`] })
    .then(
      () => { console.log('"docker-compose up -d" done')},
      err => { console.log('Error in "docker-compose up -d":', err.message)}
    );

  // Execute Mongodb user creation scripts if mongodb container is present
  const res = await dockerCompose.ps({ cwd: devcontainerDir, log: true, composeOptions: ["-p", `${projectName}_devcontainer`]});
  if (res.out.includes('mongodb1')) {
    console.log('Creating replica set for mongodb');
    await dockerCompose.exec(`${projectName}_mongodb1`, "bash /scripts/mongodb_rs_init.sh", { cwd: devcontainerDir, log: true, composeOptions: ["-p", `${projectName}_devcontainer`]})
    .then(
      () => { console.log('Creating replica set is done for mongodb')},
      err => { console.log('Error in creating replica set for mongodb:', err.message)}
    );
  }

  // Stop .devcontainer
  await dockerCompose.stop({ cwd: devcontainerDir, log: true, composeOptions: ["-p", `${projectName}_devcontainer`]})
    .then(
      () => { console.log('"docker-compose stop" done')},
      err => { console.log('Error in "docker-compose stop":', err.message)}
    );

  console.log('\n',`godspeed create ${projectName} is done.`);
}

/*
* function to build GS project
*/
function GSBuild() {
  exec(`npm run build`, (error, stdout, stderr) => {
    if (error) {
        console.log(`error in godspeed build: ${error.message}`);
        return;
    }
    console.log(`godspeed build is done: ${stdout}`);
  });
  
}

/*
* function to run GS project
*/
function GSDev() {
  exec(`npm run dev`, (error, stdout, stderr) => {
    if (error) {
        console.log(`error in godspeed dev: ${error.message}`);
        return;
    }
    console.log(`godspeed dev is done: ${stdout}`);
  });
  
}

/*
* function to clean GS project
*/
function GSClean() {
  exec(`npm run clean`, (error, stdout, stderr) => {
    if (error) {
        console.log(`error in godspeed clean: ${error.message}`);
        return;
    }
    console.log(`godspeed dev is clean: ${stdout}`);
  });
  
}

/************************************************/
async function main() {
    console.log(chalk.red(figlet.textSync('godspeed-cli', { horizontalLayout: 'full' })));

    program.command('build').action(() => { GSBuild(); });
    program.command('dev').action(() => { GSDev(); });
    program.command('create <projectName>').action((projectName) => { GSCreate(projectName); });
    program.command('build').action(() => { GSBuild(); });

    const version:string = process.env.npm_package_version || '0.0.1';
    program.version(version).parse(process.argv);
}

main();
