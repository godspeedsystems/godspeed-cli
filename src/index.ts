#!/usr/bin/env node
import chalk from 'chalk';
import figlet from 'figlet';
import program from 'commander';
import path from 'path';
import simpleGit from 'simple-git';
import { spawn, spawnSync } from 'child_process';
import dockerCompose from 'docker-compose';
import { ask, prompt } from './utils';
import axios from 'axios';
import {replaceInFile} from 'replace-in-file';
import ejs from 'ejs';
import glob from 'glob';
import fs from 'fs';

const git = simpleGit();


async function  prepareContainers(projectName: string, projectDir: string, devcontainerDir: string, mongodb: boolean, postgresql: boolean) {
  // If mongoDb is selected then start mongoDb containers and set mongo cluster.
  if (mongodb) {
    // Start .devcontainer
    await dockerCompose.upMany([`mongodb1`, `mongodb2`, `mongodb3`], { cwd: devcontainerDir, log: true, composeOptions: ["-p", `${projectName}_devcontainer`] })
      .then(
        () => { console.log('mongodb containers started') },
        err => { console.log('Error in starting mongodb containers:', err.message) }
      );

    console.log('Creating replica set for mongodb');
    await dockerCompose.exec(`mongodb1`, "bash /scripts/mongodb_rs_init.sh", { cwd: devcontainerDir, log: true, composeOptions: ["-p", `${projectName}_devcontainer`] })
      .then(
        () => { console.log('Creating replica set is done for mongodb') },
        err => { console.log('Error in creating replica set for mongodb:', err.message) }
      );

  }

  let commandOptions: string[] = ['--pull'];
  if (process.platform == 'linux') {
    const cmd = spawnSync( 'id', [ '-u' ] );
    const uid = cmd.stdout?.toString().trim()

    if (uid) {
      console.log('Setting container uid', uid);
      commandOptions = ['--build-arg', `USER_UID=${uid}`];
      console.log('Setting uid/gid');
      await dockerCompose.buildOne('node', { cwd: devcontainerDir, log: true, composeOptions: ["-p", `${projectName}_devcontainer`], commandOptions },)
      .then(
        () => { },
        err => { console.log('Error in building container:', err.message) }
      );
    }
  }

  if (mongodb || postgresql) {
    console.log('Generating prisma modules');
    await dockerCompose.run('node', ['/bin/bash', '-c', "for i in src/datasources/*.prisma; do npx --yes prisma generate --schema $i && npx --yes prisma db push --schema $i; done"], { cwd: devcontainerDir, log: true, composeOptions: ["-p", `${projectName}_devcontainer`] })
      .then(
        () => { console.log('prisma modules generated') },
        err => { console.log('Error in generating prisma clients:', err.message) }
      );
  }

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
async function GSCreate(projectName: string, options: any) {
  const projectDir = path.resolve(process.cwd(), projectName);
  const devcontainerDir = path.resolve(projectDir, '.devcontainer');
  console.log('projectDir: ', projectDir, 'projectTemplateDir', options.directory);

  if (fs.existsSync(projectName)) {
    let overwrite = ask(`${projectName} exists do you want overwrite? [y/n] `);
    if (!overwrite) {
      process.exit(0)
    }
    fs.rmSync(projectName, {recursive: true, force: true})
  }

  if (!options.directory) {
  // Clone gs_project_template GIT repo
  const REPO = 'https://github.com/Mindgreppers/gs_project_template.git';
  await git.clone(REPO, projectName)
    .then(() => {
      const p = require(path.resolve(process.cwd(), `${projectName}/package.json`));
      p.name = projectName
      fs.writeFileSync(`${projectName}/package.json`, JSON.stringify(p, null, 2));
    })
    .then(() => console.log('project created'))
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
  } else {
    fs.cpSync(options.directory, projectDir, {recursive: true})
  }

  if (options.noexamples) {
    glob.sync(path.join(projectDir, 'src/{datasources,functions,events}/*')).map((f: string) => fs.unlinkSync(f));
  }

  try {
    const mongodb = ask('Do you need mongodb? [y/n] ');
    let mongoDbName;

    if (mongodb) {
      mongoDbName = prompt('Please enter name of the mongo database [default: test] ') || 'test';
    } else {
      try {
        fs.rmSync(path.join(projectDir, 'src/datasources/mongo.prisma'));
        fs.rmSync(path.join(projectDir, 'src/functions/com/biz/ds/cross_db_join.yaml'));
        fs.rmSync(path.join(projectDir, 'src/events/cross_db_join.yaml'));  
      } catch(ex) {
  
      }
    }

    const postgresql = ask('Do you need postgresdb? [y/n] ');
    let postgresDbName;
    if (postgresql) {
      postgresDbName = prompt('Please enter name of the postgres database [default: test] ') || 'test';
    } else {
      fs.rmSync(path.join(projectName, 'src/datasources/postgres.prisma'));
    }

    const kafka = ask('Do you need kafka? [y/n] ');
    const elasticsearch = ask('Do you need elastisearch? [y/n] ');
    const redis = false; //ask('Do you need redis? [y/n] ');
    const svcPort: Number = Number(prompt('Please enter host port on which you want to run your service [default: 3000] ') || 3000);

    // Ask user about release version information of gs_service and change version in Dockerfile
    console.log('Fetching release version information...');
    const versions = await axios.get('https://registry.hub.docker.com/v1/repositories/adminmindgrep/gs_service/tags')
    const availableVersions = versions.data.map((s:any) => s.name).join('\n');
    console.log(`Please select release version of gs_service from the available list:\n${availableVersions}`);
    const gsServiceVersion = prompt('Enter your version [default: latest] ') || 'latest';
    console.log(`Selected version ${gsServiceVersion}`);
    await replaceInFile(
      {
        files: devcontainerDir + '/Dockerfile',
        from: /adminmindgrep\/gs_service:.*/,
        to: `adminmindgrep/gs_service:${gsServiceVersion}`,
      }
    )

    // Create devcontainer.json file
    const devcontainerPath = path.resolve(devcontainerDir, 'devcontainer.json.ejs');
    const devcontainerTemplate = ejs.compile(fs.readFileSync(devcontainerPath, 'utf-8'));
    fs.writeFileSync(devcontainerPath.replace('.ejs', ''), devcontainerTemplate({ projectName, svcPort }));

    const dockerComposePath = path.resolve(devcontainerDir, 'docker-compose.yml.ejs');
    const dockerComposeTemplate = ejs.compile(fs.readFileSync(dockerComposePath, 'utf-8'));

    fs.writeFileSync(dockerComposePath.replace('.ejs', ''), dockerComposeTemplate({
      projectName, mongodb, mongoDbName,
      postgresql, postgresDbName, kafka, elasticsearch, redis, svcPort
    }));

    const mongodbRsInitPath = path.join(devcontainerDir, '/scripts/mongodb_rs_init.sh.ejs');
    const mongodbRsInitPathTemplate = ejs.compile(fs.readFileSync(mongodbRsInitPath, 'utf-8'));
    fs.writeFileSync(mongodbRsInitPath.replace('.ejs', ''), mongodbRsInitPathTemplate({ projectName, mongoDbName }),'utf-8');
    
    await replaceInFile(
      {
        files: devcontainerDir + '/scripts/*',
        from: /\r\n/g,
        to: '\n',
      }
    )

    // docker-compose -p <projectname_devcontainer> down -v --remove-orphans
    await dockerCompose.down({ cwd: devcontainerDir, log: true, composeOptions: ["-p", `${projectName}_devcontainer`], commandOptions:['--remove-orphans', '-v']})
    .then(
      () => { console.log('"docker-compose down" done') },
      err => { console.log('Error in "docker-compose down":', err.message) }
    );

    // // docker kill `docker ps -q`
    // await spawnSync('docker kill `docker ps -q`')

    await prepareContainers(projectName, projectName, devcontainerDir, mongodb, postgresql);

    // docker-compose -p <projectname_devcontainer> stop
    await dockerCompose.stop({ cwd: devcontainerDir, log: true, composeOptions: ["-p", `${projectName}_devcontainer`] })
    .then(
      () => { console.log('"docker-compose stop" done') },
      err => { console.log('Error in "docker-compose stop":', err.message) }
    );

    fs.writeFileSync(`${projectName}/.godspeed`, JSON.stringify({
      projectName,
      mongodb,
      postgresql,
      kafka,
      elasticsearch
    }))

    console.log('\n', `godspeed create ${projectName} is done.`);
  } catch (ex) {
    console.error((ex as Error).message);
    console.log('\n', `godspeed create ${projectName} is failed cleaning up...`);
    fs.rmSync(projectName, { recursive: true, force: true });
  }
}

async function changeVersion(version: string) {
  let gs: any;
  try {
    gs = JSON.parse(fs.readFileSync(path.join(process.cwd(),'.godspeed'),'utf-8'));
  } catch(ex) {
    console.error('Run version command from Project Root',ex);
    process.exit(1);
  }
  replaceInFile(
    {
      files: '.devcontainer/Dockerfile',
      from: /adminmindgrep\/gs_service:.*/,
      to: `adminmindgrep/gs_service:${version}`,
    }
  )
  .then(async(changedFiles) => {
    if (!changedFiles[0].hasChanged) {
      console.log(`Version Not changed to ${version}`);
    } else {
      try {
        await prepareContainers(gs.projectName, '.', '.devcontainer', gs.mongodb, gs.postgresql);
      } catch(ex) {
        console.error('Run prepare command from Project Root',ex);
      }
      console.log(`Version changed to ${version}`);
    }
  })
  .catch((error:Error) => {
    console.error('Error occurred:', error);
  });
}

/************************************************/
async function main() {
  console.log(chalk.green(figlet.textSync('godspeed-cli', { horizontalLayout: 'full' })));

  if (process.argv[2] == 'prisma') {
    return spawn('npx', ['prisma'].concat(process.argv.slice(3)), {
      stdio: 'inherit'
    });
  }

  program.command('create <projectName>').option('-n, --noexamples', 'create blank project without examples').option('-d, --directory <projectTemplateDir>', 'local project template dir').action((projectName, options) => { GSCreate(projectName, options); });

  program
    .command('prisma')
    .allowUnknownOption()


  program.command('versions')
    .description('List all the available versions of gs_service')
    .action(() => {
    axios
      .get('https://registry.hub.docker.com/v1/repositories/adminmindgrep/gs_service/tags')
      .then(res => {
        console.log(res.data.map((s:any) => s.name).join('\n'));
      })
      .catch(error => {
        console.error(error)
      })
    });

  program.command('prepare', 'prepare the containers, before launch or after cleaning the containers').action(async () => {
    try {
      const gs = JSON.parse(fs.readFileSync(path.join(process.cwd(),'.godspeed'),'utf-8'));
      await prepareContainers(gs.projectName, '.', '.devcontainer', gs.mongodb, gs.postgresql);
    } catch(ex) {
      console.log('Run prepare command from Project Root');
    }
  });

  program.command('version <version>').action((version) => { changeVersion(version) });

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
  } catch (ex) {

  }

  const version = require('../package.json').version;
  program.version(version).parse(process.argv);
}

main();
