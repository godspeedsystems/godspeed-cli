#!/usr/bin/env node
import chalk from 'chalk';
import figlet from 'figlet';
import program from 'commander';
import path from 'path';
import simpleGit from 'simple-git';
import { exec, execSync, spawn } from 'child_process';
import dockerCompose from 'docker-compose';
import { ask, prompt } from './utils';

import fs from 'fs';

import Handlebars from 'handlebars';

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
  const devcontainerPath = path.resolve(devcontainerDir, 'devcontainer.json.hbs');
  const devcontainerTemplate = Handlebars.compile(fs.readFileSync(devcontainerPath, 'utf-8'), { noEscape: true });
  fs.writeFileSync(devcontainerPath.replace('.hbs', ''), devcontainerTemplate({ projectName }, {helpers: { json: JSON.stringify }}));

  const mongodb = ask('Do you need mongodb? [y/n] ');
  let mongoDbName;

  if (mongodb) {
    mongoDbName = prompt('Please enter name of the mongo database [default: test] ') || 'test';
  }

  const postgresql = ask('Do you need postgresdb? [y/n] ');
  let postgresDbName;
  if (postgresql) {
    postgresDbName = prompt('Please enter name of the postgres database [default: test] ') || 'test';
  }

  const kafka = ask('Do you need kafka? [y/n] ');
  const elastisearch = ask('Do you need elastisearch? [y/n] ');
  const redis = true; //ask('Do you need redis? [y/n] ');

  const dockerComposePath = path.resolve(devcontainerDir,'docker-compose.yml.hbs');
  const dockerComposeTemplate = Handlebars.compile(fs.readFileSync(dockerComposePath, 'utf-8'), { noEscape: true });

  fs.writeFileSync(dockerComposePath.replace('.hbs', ''), dockerComposeTemplate({ projectName, mongodb, mongoDbName,
      postgresql, postgresDbName, kafka, elastisearch, redis }, {helpers: { json: JSON.stringify }}));

  const mongodbRsInitPath = path.join(devcontainerDir,'/scripts/mongodb_rs_init.sh.hbs');
  const mongodbRsInitPathTemplate = Handlebars.compile(fs.readFileSync(mongodbRsInitPath, 'utf-8'),{ noEscape: true });
  fs.writeFileSync(mongodbRsInitPath.replace('.hbs', ''), mongodbRsInitPathTemplate({ projectName, mongoDbName }, {helpers: { json: JSON.stringify }}));

  // If mongoDb is selected then start mongoDb containers and set mongo cluster. Also, start node container to do npm install of gs_service.
  // else start only node container to do npm install in gs_service
  if (mongodb) {
    // Start .devcontainer
    await dockerCompose.upMany([`node`,`mongodb1`, `mongodb2`, `mongodb3`], { cwd: devcontainerDir, log: true, composeOptions: ["-p", `${projectName}_devcontainer`] })
      .then(
        () => { console.log('mongodb and node containers started')},
        err => { console.log('Error in starting mongodb and node containers:', err.message)}
      );

    console.log('Creating replica set for mongodb');
    await dockerCompose.exec(`mongodb1`, "bash /scripts/mongodb_rs_init.sh", { cwd: devcontainerDir, log: true, composeOptions: ["-p", `${projectName}_devcontainer`]})
    .then(
      () => { console.log('Creating replica set is done for mongodb')},
      err => { console.log('Error in creating replica set for mongodb:', err.message)}
    );

    // npm install in project directory
    console.log('Starting npm install in project directory');
    await dockerCompose.exec(`node`, ["/bin/bash","-c","npm install"], { cwd: devcontainerDir, log: true, composeOptions: ["-p", `${projectName}_devcontainer`]})
    .then(
      () => { console.log('npm install is completed in project directory')},
      err => { console.log('Error in executing "npm install" in project directory:', err.message)}
    );

    // prisma generate and db push in project directory
    console.log('Starting "prisma generate and db push"');
    await dockerCompose.exec(`node`, ["/bin/bash","-c","for f in src/datasources/*.prisma; do npx prisma generate --schema=$f; done && for f in src/datasources/*.prisma; do npx prisma db push --schema=$f; done"], { cwd: devcontainerDir, log: true, composeOptions: ["-p", `${projectName}_devcontainer`]})
      .then(
        () => { console.log('prisma generate and db push are completed')},
        err => { console.log('Error in "prisma generate and db push":', err.message)}
      );
  
    // npm install in gs_service
    console.log('Starting npm install in gs_service');
    await dockerCompose.exec(`node`, ["/bin/bash","-c","cd gs_service; npm install"], { cwd: devcontainerDir, log: true, composeOptions: ["-p", `${projectName}_devcontainer`]})
    .then(
      () => { console.log('npm install is completed in gs_service')},
      err => { console.log('Error in executing "npm install" in gs_service:', err.message)}
    );

  } else {
    // Start .devcontainer
    await dockerCompose.upMany([`node`], { cwd: devcontainerDir, log: true, composeOptions: ["-p", `${projectName}_devcontainer`] })
      .then(
        () => { console.log('node container started')},
        err => { console.log('Error in starting node container:', err.message)}
      );

    // npm install in project directory
    console.log('Starting npm install in project directory');
    await dockerCompose.exec(`node`, ["/bin/bash","-c","npm install"], { cwd: devcontainerDir, log: true, composeOptions: ["-p", `${projectName}_devcontainer`]})
    .then(
      () => { console.log('npm install is completed in project directory')},
      err => { console.log('Error in executing "npm install" in project directory:', err.message)}
    );

    // prisma generate and db push in project directory
    console.log('Starting "prisma generate and db push"');
    await dockerCompose.exec(`node`, ["/bin/bash","-c","for f in src/datasources/*.prisma; do npx prisma generate --schema=$f; done && for f in src/datasources/*.prisma; do npx prisma db push --schema=$f; done"], { cwd: devcontainerDir, log: true, composeOptions: ["-p", `${projectName}_devcontainer`]})
      .then(
        () => { console.log('prisma generate and db push are completed')},
        err => { console.log('Error in "prisma generate and db push":', err.message)}
      );
  
    // npm install in gs_service
    console.log('Starting npm install in gs_service');
    await dockerCompose.exec(`node`, ["/bin/bash","-c","cd gs_service; npm install"], { cwd: devcontainerDir, log: true, composeOptions: ["-p", `${projectName}_devcontainer`]})
    .then(
      () => { console.log('npm install is completed in gs_service')},
      err => { console.log('Error in executing "npm install" in gs_service:', err.message)}
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

    const version = require('../package.json').version;
    program.version(version).parse(process.argv);
}

main();
