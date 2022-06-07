#!/usr/bin/env node
import chalk from 'chalk';
import figlet from 'figlet';
import program from 'commander';
import path from 'path';
import simpleGit from 'simple-git';
import { exec, execSync, spawn } from 'child_process';
import dockerCompose from 'docker-compose';
import { createDockerCompose, incMongo } from './dockerCompose';
import createDevContainerJson from './devContainerJson';
import createMongodbRsInit from './mongodb_rs_init';
import fs from 'fs';

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
    .then(() => {
      const p = require(path.resolve(process.cwd(),`${projectName}/package.json`));
      p.name = projectName
      fs.writeFileSync(`${projectName}/package.json`, JSON.stringify(p, null, 2));
    })
    .then(() => console.log('project created'))
    .catch((err) => {
      console.error('error in project creation, not able to clone repo. Error Message: ', err);
      process.exit(1);
    });

  // Create devcontainer.json file
  createDevContainerJson(projectName, devcontainerDir);

  // Create docker-compose.yml file
  createDockerCompose(projectName, devcontainerDir);

  // Create mongodb_rs_init.sh file
  createMongodbRsInit(projectName, devcontainerDir);

  // If mongoDb is selected then start mongoDb containers and set mongo cluster. 
  if (incMongo) {
    // Start .devcontainer
    await dockerCompose.upMany([`${projectName}_mongodb1`, `${projectName}_mongodb2`, `${projectName}_mongodb3`], { cwd: devcontainerDir, log: true, composeOptions: ["-p", `${projectName}_devcontainer`] })
      .then(
        () => { console.log('mongodb containers started')},
        err => { console.log('Error in starting mongodb containers:', err.message)}
      );

    console.log('Creating replica set for mongodb');
    await dockerCompose.exec(`${projectName}_mongodb1`, "bash /scripts/mongodb_rs_init.sh", { cwd: devcontainerDir, log: true, composeOptions: ["-p", `${projectName}_devcontainer`]})
    .then(
      () => { console.log('Creating replica set is done for mongodb')},
      err => { console.log('Error in creating replica set for mongodb:', err.message)}
    );

    // Stop .devcontainer
    await dockerCompose.stop({ cwd: devcontainerDir, log: true, composeOptions: ["-p", `${projectName}_devcontainer`]})
      .then(
        () => { console.log('"docker-compose stop" done')},
        err => { console.log('Error in "docker-compose stop":', err.message)}
      );
  }
  console.log('\n',`godspeed create ${projectName} is done.`);
}

/************************************************/
async function main() {
    console.log(chalk.red(figlet.textSync('godspeed-cli', { horizontalLayout: 'full' })));

    if (process.argv[2] ==  'prisma') {
        return spawn('npx', ['prisma'].concat(process.argv.slice(3)),{
          stdio: 'inherit'
        });
    }


    program.command('create <projectName>').action((projectName) => { GSCreate(projectName); });
    program
    .command('prisma')
    .allowUnknownOption()

    try {
      const scripts = require(path.resolve(process.cwd(), `package.json`)).scripts;

      for (let script in scripts) {
        program
        .command(script)
        .allowUnknownOption()
        .addHelpText('after', `
  Will run:
    $ ${scripts[script]}`)
        .action(() => {
          spawn('npm', ['run'].concat(process.argv.slice(2)), {
            stdio: 'inherit'
          });
        });
      }
    } catch(ex) {

    }

    const version:string = process.env.npm_package_version || '0.0.1';
    program.version(version).parse(process.argv);
}

main();
