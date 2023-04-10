#!/usr/bin/env node
import chalk from "chalk";
import figlet from "figlet";
import program from "commander";
import path from "path";
import simpleGit from "simple-git";
import { execSync, spawn } from "child_process";
import dockerCompose from "docker-compose";
import { ask, prompt, userID } from "./utils";
import axios from "axios";
import { replaceInFile } from "replace-in-file";
import ejs from "ejs";
import glob from "glob";
import fs from "fs";
import { PlainObject } from "./common";

import terminalColors from './terminal_colors';

let log = console.log.bind(console);

console.log = (...args) => {
  log(terminalColors.FgYellow + args[0] + terminalColors.Reset, args.length > 1 ? args.slice(1) : '');
}

console.error = (...args) => {
  log(terminalColors.FgRed + args[0] + terminalColors.Reset, args.length > 1 ? args.slice(1) : '');
}


const git = simpleGit();

async function prepareContainers(
  projectName: string,
  gsServiceVersion: string,
  devcontainerDir: string,
  composeOptions: PlainObject,
  mongodb: boolean,
  postgresql: boolean
) {
  // If mongoDb is selected then start mongoDb containers and set mongo cluster.
  if (mongodb) {
    console.log("Pulling mongodb...");

    // Start .devcontainer
    await dockerCompose
      .upMany([`mongodb1`, `mongodb2`, `mongodb3`], composeOptions)
      .then(
        () => {
          console.log("mongodb containers started");
        },
        (err) => {
          console.error("Error in starting mongodb containers:", err.message);
        }
      );

    console.log("Creating replica set for mongodb");
    await dockerCompose
      .exec(`mongodb1`, "bash /scripts/mongodb_rs_init.sh", composeOptions)
      .then(
        () => {
          console.log("Creating replica set is done for mongodb");
        },
        (err) => {
          console.error(
            "Error in creating replica set for mongodb:",
            err.message
          );
        }
      );
  }

  console.log("Pulling framework Image...");

  const res = execSync(`docker pull adminmindgrep/gs_service:${gsServiceVersion}`);

  let commandOptions: string[] = [];

  console.log("Building framework Image...");

  await dockerCompose
    .buildOne("node", {
      ...composeOptions,
      commandOptions
    })
    .then(
      () => {},
      (err) => {
        console.error("Error in building container:", err.message);
      }
    );

  if (mongodb || postgresql) {
    console.log("Generating prisma modules");
    await dockerCompose
      .run(
        "node",
        [
          "/bin/bash",
          "-c",
          "for i in src/datasources/*.prisma; do npx --yes prisma generate --schema $i && npx --yes prisma db push --schema $i; done",
        ],
        composeOptions
      )
      .then(
        () => {
          console.log("prisma modules generated");
        },
        (err) => {
          console.error("Error in generating prisma clients:", err.message);
        }
      );
  }

  // docker compose -p <projectname_devcontainer> stop
  await dockerCompose
    .stop(composeOptions)
    .then(
      () => {
        console.log('"docker compose stop" done');
      },
      (err) => {
        console.error('Error in "docker compose stop":', err.message);
      }
    );
}

/*
 * function to update GS Project
 */
async function GSUpdate(composeOptions: PlainObject) {
  let gs: any;
  try {
    gs = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), ".godspeed"), "utf-8")
    );

    const projectDir = process.cwd();
    const devcontainerDir = path.resolve(projectDir, ".devcontainer");

    let {
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
    } = gs;

    composeOptions.cwd = devcontainerDir;
    composeOptions.composeOptions.push(`${projectName}_devcontainer`);

    try {
      if (!gs.mongodb) {
        mongodb = ask("Do you need mongodb? [y/n] ");
        if (mongodb) {
          mongoDbName =
            prompt(
              "Please enter name of the mongo database [default: test] "
            ) || "test";
          mongoDb1Port = Number(
            prompt("Please enter host port for mongodb1 [default: 27017] ") ||
              27017
          );
          mongoDb2Port = Number(
            prompt("Please enter host port for mongodb2 [default: 27018] ") ||
              27018
          );
          mongoDb3Port = Number(
            prompt("Please enter host port for mongodb3 [default: 27019] ") ||
              27019
          );
        }
      }

      if (!gs.postgresql) {
        postgresql = ask("Do you need postgresdb? [y/n] ");
        if (postgresql) {
          postgresDbName =
            prompt(
              "Please enter name of the postgres database [default: test] "
            ) || "test";
          postgresDbPort = Number(
            prompt("Please enter host port for postgres [default: 5432] ") ||
              5432
          );
        }
      }

      if (!gs.kafka) {
        kafka = ask("Do you need kafka? [y/n] ");
        if (kafka) {
          kafkaPort = Number(
            prompt("Please enter host port for kafka [default: 9092] ") || 9092
          );
          zookeeperPort = Number(
            prompt("Please enter host port for zookeeper [default: 2181] ") ||
              2181
          );
        }
      }

      if (!gs.elasticsearch) {
        elasticsearch = ask("Do you need elastisearch? [y/n] ");
        if (elasticsearch) {
          elasticsearchPort = Number(
            prompt(
              "Please enter host port for elasticsearch [default: 9200] "
            ) || 9200
          );
        }
      }

      if (!gs.redis) {
        redis = ask("Do you need redis? [y/n] ");
        if (redis) {
          redisPort = Number(
            prompt("Please enter host port for redis [default: 6379] ") || 6379
          );
        }
      }

      svcPort = Number(
        prompt(
          `Please enter host port on which you want to run your service [current: ${gs.svcPort}] `
        ) || gs.svcPort
      );

      // Ask user about release version information of gs_service and change version in Dockerfile
      console.log("Fetching release version information...");
      const versions = await axios.get(
        "https://registry.hub.docker.com/v2/namespaces/adminmindgrep/repositories/gs_service/tags?page_size=1024"
      );
      const availableVersions = versions.data.results
        .map((s: any) => s.name)
        .join("\n");
      console.log(
        `Please select release version of gs_service from the available list:\n${availableVersions}`
      );
      const gsServiceVersion =
        prompt("Enter your version [default: latest] ") || "latest";
      console.log(`Selected version ${gsServiceVersion}`);
      await replaceInFile({
        files: devcontainerDir + "/Dockerfile",
        from: /adminmindgrep\/gs_service:.*/,
        to: `adminmindgrep/gs_service:${gsServiceVersion}`,
      });

      // Fetching UID information
      userUID = userID();
      console.log("User ID is", userUID);

      // Create devcontainer.json file
      const devcontainerPath = path.resolve(
        devcontainerDir,
        "devcontainer.json.ejs"
      );
      const devcontainerTemplate = ejs.compile(
        fs.readFileSync(devcontainerPath, "utf-8")
      );
      fs.writeFileSync(
        devcontainerPath.replace(".ejs", ""),
        devcontainerTemplate({ projectName, svcPort })
      );

      const dockerComposePath = path.resolve(
        devcontainerDir,
        "docker-compose.yml.ejs"
      );
      const dockerComposeTemplate = ejs.compile(
        fs.readFileSync(dockerComposePath, "utf-8")
      );

      fs.writeFileSync(
        dockerComposePath.replace(".ejs", ""),
        dockerComposeTemplate({
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
        })
      );

      const mongodbRsInitPath = path.join(
        devcontainerDir,
        "/scripts/mongodb_rs_init.sh.ejs"
      );
      const mongodbRsInitPathTemplate = ejs.compile(
        fs.readFileSync(mongodbRsInitPath, "utf-8")
      );
      fs.writeFileSync(
        mongodbRsInitPath.replace(".ejs", ""),
        mongodbRsInitPathTemplate({ projectName, mongoDbName }),
        "utf-8"
      );

      await replaceInFile({
        files: devcontainerDir + "/scripts/*",
        from: /\r\n/g,
        to: "\n",
      });

      if (process.platform != 'win32') {
        const res = execSync(`chmod 755 ${devcontainerDir}/scripts/mongodb_init.sh ${devcontainerDir}/scripts/mongodb_rs_init.sh`);
      }

      // docker compose -p <projectname_devcontainer> down --remove-orphans
      await dockerCompose
        .down({
          ...composeOptions,
          commandOptions: ["--remove-orphans"]
        })
        .then(
          () => {
            console.log('"docker compose down" done');
          },
          (err) => {
            console.error('Error in "docker compose down":', err.message);
          }
        );

      // // docker kill `docker ps -q`
      // await spawnSync('docker kill `docker ps -q`')

      await prepareContainers(
        projectName,
        gsServiceVersion,
        devcontainerDir,
        composeOptions,
        mongodb,
        postgresql
      );

      fs.writeFileSync(
        `.godspeed`,
        JSON.stringify({
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
        })
      );

      console.log("\n", `godspeed update ${projectName} is done.`);
    } catch (ex) {
      console.error((ex as Error).message);
      console.error(
        "\n",
        `godspeed update ${projectName} is failed cleaning up...`
      );
    }
  } catch (ex) {
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
async function GSCreate(projectName: string, options: any, composeOptions: PlainObject) {
  const projectDir = path.resolve(process.cwd(), projectName);
  const devcontainerDir = path.resolve(projectDir, ".devcontainer");
  composeOptions.cwd = devcontainerDir;
  composeOptions.composeOptions.push(`${projectName}_devcontainer`);

  console.log(
    "projectDir: ",
    projectDir
  );

  if (fs.existsSync(projectName)) {
    let overwrite = ask(`${projectName} exists do you want overwrite? [y/n] `);
    if (!overwrite) {
      console.error('Exiting without creating the project')
      process.exit(0);
    }
    fs.rmSync(projectName, { recursive: true, force: true });
  }

  if (!options.directory) {
    // Clone gs_project_template GIT repo
    const REPO = "https://github.com/Mindgreppers/gs_project_template.git";
    await git
      .clone(REPO, projectName)
      .then(() => {
        const p = require(path.resolve(
          process.cwd(),
          `${projectName}/package.json`
        ));
        p.name = projectName;
        fs.writeFileSync(
          `${projectName}/package.json`,
          JSON.stringify(p, null, 2)
        );
      })
      .then(() => console.log("project created"))
      .catch((err) => {
        console.error(err.message);
        process.exit(1);
      });
  } else {
    fs.cpSync(options.directory, projectDir, { recursive: true });
  }

  if (options.noexamples) {
    glob
      .sync(
        path.join(projectDir, "src/{datasources,functions,events,mappings}/*")
      )
      .map((f: string) => {
        fs.rmSync(f, { recursive: true, force: true });
      });
    // glob.sync(path.join(projectDir, 'src/{datasources,functions,events}/*')).map((f: string) => fs.unlinkSync(f));
  }

  try {
    const mongodb = ask("Do you need mongodb? [y/n] ");
    let mongoDbName,
      mongoDb1Port!: Number,
      mongoDb2Port!: Number,
      mongoDb3Port!: Number;

    if (mongodb) {
      mongoDbName =
        prompt("Please enter name of the mongo database [default: test] ") ||
        "test";
      mongoDb1Port = Number(
        prompt("Please enter host port for mongodb1 [default: 27017] ") || 27017
      );
      mongoDb2Port = Number(
        prompt("Please enter host port for mongodb2 [default: 27018] ") || 27018
      );
      mongoDb3Port = Number(
        prompt("Please enter host port for mongodb3 [default: 27019] ") || 27019
      );
    } else {
      try {
        fs.rmSync(path.join(projectDir, "src/datasources/mongo.prisma"));
        fs.rmSync(path.join(projectDir, "src/functions/com/biz/ds/cross_db_join.yaml"));
        fs.rmSync(path.join(projectDir, "src/events/cross_db_join.yaml"));
      } catch (ex) {}
    }

    const postgresql = ask("Do you need postgresdb? [y/n] ");
    let postgresDbName, postgresDbPort!: Number;
    if (postgresql) {
      postgresDbName =
        prompt("Please enter name of the postgres database [default: test] ") ||
        "test";
      postgresDbPort = Number(
        prompt("Please enter host port for postgres [default: 5432] ") || 5432
      );
    } else {
      try {
        fs.rmSync(path.join(projectDir, "src/datasources/postgres.prisma"));
        fs.rmSync(path.join(projectDir, "src/functions/com/biz/ds/cross_db_join.yaml"));
        fs.rmSync(path.join(projectDir, "src/events/cross_db_join.yaml"));
      } catch (ex) {}
    }

    if (!mongodb && !postgresql) {
      try {
        fs.rmSync(path.join(projectDir, "src/functions/com/biz/ds/create_user_then_show_all.yaml"));
        fs.rmSync(path.join(projectDir, "src/events/create_user_then_show_all.yaml"));
      } catch (ex) {}
    }

    const kafka = ask("Do you need kafka? [y/n] ");
    let kafkaPort!: Number, zookeeperPort!: Number;
    if (kafka) {
      kafkaPort = Number(
        prompt("Please enter host port for kafka [default: 9092] ") || 9092
      );
      zookeeperPort = Number(
        prompt("Please enter host port for zookeeper [default: 2181] ") || 2181
      );
    } else {
      try {
        fs.rmSync(path.join(projectName, "src/datasources/kafka1.yaml"));
        fs.rmSync(path.join(projectName, "src/events/publish_kafka.yaml"));
        fs.rmSync(
          path.join(projectName, "src/functions/com/jfs/publish_kafka.yaml")
        );
      } catch (ex) {}
    }

    const elasticsearch = ask("Do you need elastisearch? [y/n] ");
    let elasticsearchPort!: Number;
    if (elasticsearch) {
      elasticsearchPort = Number(
        prompt("Please enter host port for elasticsearch [default: 9200] ") ||
          9200
      );
    } else {
      try {
        fs.rmSync(path.join(projectDir, "src/datasources/eg_config/"), { recursive: true });
        fs.rmSync(path.join(projectDir, "src/datasources/elasticgraph.yaml"));
        fs.rmSync(path.join(projectDir, "src/functions/com/eg/eg_create.yaml"));
        fs.rmSync(path.join(projectDir, "src/functions/com/eg/eg_search.yaml"));
        fs.rmSync(path.join(projectDir, "src/events/eg_create.yaml"));
        fs.rmSync(path.join(projectDir, "src/events/eg_search.yaml"));
      } catch (ex) {}
    }

    const redis = ask("Do you need redis? [y/n] ");
    let redisPort!: Number;
    if (redis) {
      redisPort = Number(
        prompt("Please enter host port for redis [default: 6379] ") || 6379
      );
    }

    const svcPort: Number = Number(
      prompt(
        "Please enter host port on which you want to run your service [default: 3000] "
      ) || 3000
    );

    // Fetching UID information

    let userUID = userID();
    console.log("User ID is", userUID);

    // Ask user about release version information of gs_service and change version in Dockerfile
    console.log("Fetching release version information...");
    const versions = await axios.get(
      "https://registry.hub.docker.com/v2/namespaces/adminmindgrep/repositories/gs_service/tags?page_size=1024"
    );



    const availableVersions = versions.data.results
      .map((s: any) => s.name)
      .join("\n");

    console.log(
      `Please select release version of gs_service from the available list:\n${availableVersions}`
    );
    const gsServiceVersion =
      prompt("Enter your version [default: latest] ") || "latest";

    console.log(`Selected version ${gsServiceVersion}`);

    await replaceInFile({
      files: devcontainerDir + "/Dockerfile",
      from: /adminmindgrep\/gs_service:.*/,
      to: `adminmindgrep/gs_service:${gsServiceVersion}`,
    });

    // Create devcontainer.json file
    const devcontainerPath = path.resolve(
      devcontainerDir,
      "devcontainer.json.ejs"
    );
    const devcontainerTemplate = ejs.compile(
      fs.readFileSync(devcontainerPath, "utf-8")
    );
    fs.writeFileSync(
      devcontainerPath.replace(".ejs", ""),
      devcontainerTemplate({ projectName, svcPort })
    );

    const dockerComposePath = path.resolve(
      devcontainerDir,
      "docker-compose.yml.ejs"
    );
    const dockerComposeTemplate = ejs.compile(
      fs.readFileSync(dockerComposePath, "utf-8")
    );

    fs.writeFileSync(
      dockerComposePath.replace(".ejs", ""),
      dockerComposeTemplate({
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
      })
    );

    const mongodbRsInitPath = path.join(
      devcontainerDir,
      "/scripts/mongodb_rs_init.sh.ejs"
    );
    const mongodbRsInitPathTemplate = ejs.compile(
      fs.readFileSync(mongodbRsInitPath, "utf-8")
    );
    fs.writeFileSync(
      mongodbRsInitPath.replace(".ejs", ""),
      mongodbRsInitPathTemplate({ projectName, mongoDbName }),
      "utf-8"
    );

    await replaceInFile({
      files: devcontainerDir + "/scripts/*",
      from: /\r\n/g,
      to: "\n",
    });

    // docker compose -p <projectname_devcontainer> down -v --remove-orphans
    await dockerCompose
      .down({
        ...composeOptions,
        commandOptions: ["--remove-orphans", "-v"]
      })
      .then(
        () => {
          console.log('"docker compose down" done');
        },
        (err) => {
          //console.log('Error in "docker compose down":', err.message);
        }
      );

    // // docker kill `docker ps -q`
    // await spawnSync('docker kill `docker ps -q`')

    console.log('Preparing Containers...');

    await prepareContainers(
      projectName,
      gsServiceVersion,
      devcontainerDir,
      composeOptions,
      mongodb,
      postgresql
    );

    fs.writeFileSync(
      `${projectName}/.godspeed`,
      JSON.stringify({
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
      })
    );

    console.log("\n", `godspeed create ${projectName} is done.`);
  } catch (ex) {
    console.error((ex as Error).message);
    console.log(
      "\n",
      `godspeed create ${projectName} is failed cleaning up...`
    );
    fs.rmSync(projectName, { recursive: true, force: true });
  }
}

async function changeVersion(version: string, composeOptions: PlainObject) {
  let gs: any;
  try {
    gs = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), ".godspeed"), "utf-8")
    );
  } catch (ex) {
    console.error("Run version command from Project Root", ex);
    process.exit(1);
  }

  composeOptions.cwd = ".devcontainer";
  composeOptions.composeOptions.push(`${gs.projectName}_devcontainer`);

  replaceInFile({
    files: ".devcontainer/Dockerfile",
    from: /adminmindgrep\/gs_service:.*/,
    to: `adminmindgrep/gs_service:${version}`,
  })
    .then(async (changedFiles) => {
      if (!changedFiles[0].hasChanged) {
        console.log(`Version Not changed to ${version}`);
      } else {
        try {
          await prepareContainers(
            gs.projectName,
            version,
            ".devcontainer",
            composeOptions,
            gs.mongodb,
            gs.postgresql
          );
        } catch (ex) {
          console.error("Run prepare command from Project Root", ex);
        }
        console.log(`Version changed to ${version}`);
      }
    })
    .catch((error: Error) => {
      console.error("Error occurred:", error);
    });
}

/************************************************/
async function main() {
  console.log(
    chalk.green(figlet.textSync("godspeed", { horizontalLayout: "full" }))
  );
  if (process.argv[2] == "prisma") {
    return spawn("npx", ["prisma"].concat(process.argv.slice(3)), {
      stdio: "inherit",
    });
  }

  let composeOptions: PlainObject = {};
  if (process.platform != 'win32') {
    let res;
    try {
      res = execSync(`docker-compose -v`,{
        stdio: ['pipe', 'pipe', 'ignore']
      });
    } catch (err) {
    }

    if (!res) {
      composeOptions = {
        executablePath: 'docker',
        log: true,
        composeOptions: ["compose", "-p"],
      };
    } else {
      composeOptions = {
        log: true,
        composeOptions: ["-p"],
      };
    }

  } else {
    composeOptions = {
      executablePath: 'docker',
      log: true,
      composeOptions: ["compose", "-p"],
    };
  }

  program
    .command("create <projectName>")
    .option("-n, --noexamples", "create blank project without examples")
    .option(
      "-d, --directory <projectTemplateDir>",
      "local project template dir"
    )
    .action((projectName, options) => {
      GSCreate(projectName, options, composeOptions);
    });

  program.command("update").action(() => {
    GSUpdate(composeOptions);
  });

  program.command("prisma").allowUnknownOption();

  program
    .command("versions")
    .description("List all the available versions of gs_service")
    .action(() => {
      axios
        .get(
          "https://registry.hub.docker.com/v2/namespaces/adminmindgrep/repositories/gs_service/tags?page_size=1024"
        )
        .then((res) => {
          console.log(res.data.results.map((s: any) => s.name).join("\n"));
        })
        .catch((error) => {
          console.error(error);
        });
    });

  program.command("version <version>").action((version) => {
    changeVersion(version, composeOptions);
  });

  try {
    const scripts = require(path.resolve(
      process.cwd(),
      `package.json`
    )).scripts;

    for (let script in scripts) {
      program
        .command(script)
        .allowUnknownOption()
        .addHelpText(
          "after",
          `
  Will run:
    $ ${scripts[script]}`
        )
        .action(() => {
          spawn("npm", ["run"].concat(process.argv.slice(2)), {
            stdio: "inherit",
          });
        });
    }
  } catch (ex) {}

  const version = require("../package.json").version;
  program.version(version, "-v, --version").parse(process.argv);

  if (process.argv.length < 3) {
    program.help();
  }
}

main();
