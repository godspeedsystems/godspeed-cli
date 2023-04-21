import dockerCompose from "docker-compose";
import { execSync } from "child_process";
import { PlainObject } from "../common";

export default async function (
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

  const res = execSync(
    `docker pull godspeedsystems/gs-node-service:${gsServiceVersion}`
  );

  let commandOptions: string[] = [];

  console.log("Building framework Image...");

  await dockerCompose
    .buildOne("node", {
      ...composeOptions,
      commandOptions,
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
  await dockerCompose.stop(composeOptions).then(
    () => {
      console.log('"docker compose stop" done');
    },
    (err) => {
      console.error('Error in "docker compose stop":', err.message);
    }
  );
}
