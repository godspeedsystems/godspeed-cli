import path from "path";
import { execSync } from "child_process";
import dockerCompose from "docker-compose";
import { ask, generateFileFromTemplate, prompt, userID } from "../utils";
import axios from "axios";
import { replaceInFile } from "replace-in-file";
import ejs from "ejs";
import fs from "fs";
import { PlainObject } from "../common";
import prepareContainers from "../utils/prepareContainers";

/*
 * function to update GS Project
 */
export default async function (composeOptions: PlainObject) {
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
        `${process.env.DOCKER_REGISTRY_URL}/tags?page_size=1024`
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

      // update mechanism for root level DOckerfile
      generateFileFromTemplate(
        path.resolve(devcontainerDir, "Dockerfile.ejs"),
        path.resolve(devcontainerDir, "Dockerfile"),
        {
          dockerRegistry: process.env.DOCKER_REGISTRY,
          dockerPackageName: process.env.DOCKER_PACKAGE_NAME,
          tag: gsServiceVersion,
        }
      );

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

      if (process.platform != "win32") {
        const res = execSync(
          `chmod 755 ${devcontainerDir}/scripts/mongodb_init.sh ${devcontainerDir}/scripts/mongodb_rs_init.sh`
        );
      }

      // docker compose -p <projectname_devcontainer> down --remove-orphans
      await dockerCompose
        .down({
          ...composeOptions,
          commandOptions: ["--remove-orphans"],
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
