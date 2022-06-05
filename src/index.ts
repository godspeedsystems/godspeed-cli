#!/usr/bin/env node
import chalk from 'chalk';
import figlet from 'figlet';
import program from 'commander';
import path from 'path';
import simpleGit from 'simple-git';
import { exec } from 'child_process';
import dockerCompose from 'docker-compose';
import createDockerCompose from './dockerCompose';
import createDevContainerJson from './devContainerJson';
import createMongodbRsInit from './mongodb_rs_init';

const git = simpleGit();

/*
* function to init GS Project
* This function has below main steps:
*   - Clone gs_project_template GIT repo into projectName
*   - Create docker-compose.yml file after getting information from user by prompt (mongodb, postgresdb, elasticsearch, kafka, redis)
*/
async function GSInit(projectName: string) {
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
  await exec(`chmod 0600 ${devcontainerDir}/mongo-keyfile`, (error) => {
    if (error) {
        console.log(`error in setting permissions of ${devcontainerDir}/mongo-keyfile: ${error.message}`);
        return;
    }
  });

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
    await dockerCompose.exec(`${projectName}_mongodb1`, "bash /scripts/mongodb_rs_init.sh", { cwd: devcontainerDir, log: true, composeOptions: ["-p", `${projectName}_devcontainer`]});
  }

  // Stop .devcontainer
  await dockerCompose.stop({ cwd: devcontainerDir, log: true, composeOptions: ["-p", `${projectName}_devcontainer`]})
    .then(
      () => { console.log('"docker-compose stop" done')},
      err => { console.log('Error in "docker-compose stop":', err.message)}
    );

  console.log('\n','godspeed --init <projectName> is done.');
}

/*
* function to build GS project
*/
function GSBuild() {
  console.log('This is GSBuild.');
  exec(`npm run build`, (error, stdout, stderr) => {
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
    console.log(chalk.red(figlet.textSync('godspeed-cli', { horizontalLayout: 'full' })));

    program
      .version('1.0')
      .description("Godspeed CLI")
      .option('-b, --build', 'To build the project')
      .option('-i, --init <projectName>', 'To initialize a project')
      .parse(process.argv);

    const options = program.opts();

    if (!process.argv.slice(2).length) {
      program.outputHelp();
    }

    // build option
    if (options.build) {
      GSBuild();
    }

    // init option
    if (options.init) {
      const projectName: string = options.init;
      GSInit(projectName);
    }
}

main();
