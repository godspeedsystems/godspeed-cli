import path from "path";
import fs from "fs";
import simpleGit from "simple-git";
import glob from "glob";
import axios from "axios";
import dockerCompose from "docker-compose";
import { replaceInFile } from "replace-in-file";
import ejs from "ejs";

import { ask, generateFileFromTemplate, prompt, userID } from "../utils";
import { PlainObject } from "../common";
import prepareContainers from "../utils/prepareContainers";

/*
 * function to init GS Project
 * This function has below main steps:
 *   - Clone gs_project_template GIT repo into projectName
 *   - Create docker-compose.yml file after getting information from user by prompt (mongodb, postgresdb, elasticsearch, kafka, redis)
 */

export default async function (
  projectName: string,
  options: any,
  composeOptions: PlainObject
) {
  const projectDir = path.resolve(process.cwd(), projectName);
  const devcontainerDir = path.resolve(projectDir, ".devcontainer");
  composeOptions.cwd = devcontainerDir;
  composeOptions.composeOptions.push(`${projectName}_devcontainer`);

  console.log("projectDir: ", projectDir);

  if (fs.existsSync(projectName)) {
    let overwrite = ask(`${projectName} exists do you want overwrite? [y/n] `);
    if (!overwrite) {
      console.error("Exiting without creating the project");
      process.exit(0);
    }
    fs.rmSync(projectName, { recursive: true, force: true });
  }

  if (!options.directory) {
    const git = simpleGit();
    const REPO = `${process.env.GITHUB_REPO_URL}`;
    // clone godspeedsystems/godspeed-scaffolding repo
    await git
      .clone(REPO, projectName, {
        "--branch": `${process.env.GITHUB_REPO_BRANCH}`,
      })
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
        prompt("Please enter name of the mongo database [default: test]") ||
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
        fs.rmSync(
          path.join(projectDir, "src/functions/com/biz/ds/cross_db_join.yaml")
        );
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
        fs.rmSync(
          path.join(projectDir, "src/functions/com/biz/ds/cross_db_join.yaml")
        );
        fs.rmSync(path.join(projectDir, "src/events/cross_db_join.yaml"));
      } catch (ex) {}
    }

    if (!mongodb && !postgresql) {
      try {
        fs.rmSync(
          path.join(
            projectDir,
            "src/functions/com/biz/ds/create_user_then_show_all.yaml"
          )
        );
        fs.rmSync(
          path.join(projectDir, "src/events/create_user_then_show_all.yaml")
        );
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
        fs.rmSync(path.join(projectDir, "src/datasources/eg_config/"), {
          recursive: true,
        });
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
      `${process.env.DOCKER_REGISTRY_TAGS_VERSION_URL}`
    );

    const availableVersions = versions.data.results
      .map((s: any) => s.name)
      .join("\n");

    console.log(
      `Please select release version of gs-node-service(Godspeed Framework) from the available list:\n${availableVersions}`
    );

    const gsServiceVersion =
      prompt("Enter your version [default: latest] ") || "latest";

    console.log(`Selected version ${gsServiceVersion}`);

    // generate porject level Dockerfile from template available at `${projectDir}/Dockerfile.ejs`
    generateFileFromTemplate(
      path.resolve(projectDir, "Dockerfile.ejs"),
      path.resolve(projectDir, "Dockerfile"),
      {
        dockerRegistry: process.env.DOCKER_REGISTRY,
        dockerPackageName: process.env.DOCKER_PACKAGE_NAME,
        tag: gsServiceVersion,
      }
    );

    // generate .devcontainer level Dockerfile from template available at `${projectDir}/.devcontainer/Dockerfile.ejs`
    generateFileFromTemplate(
      path.resolve(projectDir, ".devcontainer", "Dockerfile.ejs"),
      path.resolve(projectDir, ".devcontainer", "Dockerfile"),
      {
        dockerRegistry: process.env.DOCKER_REGISTRY,
        dockerPackageName: process.env.DOCKER_PACKAGE_NAME,
        tag: gsServiceVersion,
      }
    );

    // generate .devcontainer config from template
    generateFileFromTemplate(
      path.resolve(devcontainerDir, "devcontainer.json.ejs"),
      path.resolve(devcontainerDir, "devcontainer.json"),
      { projectName, svcPort }
    );

    // generate docker-compose.yml from template
    generateFileFromTemplate(
      path.resolve(devcontainerDir, "docker-compose.yml.ejs"),
      path.resolve(devcontainerDir, "docker-compose.yml"),
      {
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
      }
    );

    // generate mogodb init script
    generateFileFromTemplate(
      path.resolve(devcontainerDir, "scripts/mongodb_rs_init.sh.ejs"),
      path.resolve(devcontainerDir, "scripts/mongodb_rs_init.sh"),
      { projectName, mongoDbName }
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
        commandOptions: ["--remove-orphans", "-v"],
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

    console.log("Preparing Containers...");

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