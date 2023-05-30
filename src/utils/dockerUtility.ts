import glob from "glob";
import dockerCompose, {
  type IDockerComposeOptions,
  type IDockerComposeResult,
} from "docker-compose";

import { execSync } from "child_process";
import chalk from "chalk";
import { log } from "./signale";
import path from "path";

export const isDockerRunning = async (): Promise<boolean> => {
  let isRunning: boolean = false;
  log.wait(`Checking if ${chalk.yellow("docker")} is installed and running?`);
  try {
    execSync("docker version", {
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
      stdio: ["pipe", "pipe", "ignore"],
    }).toString();
    isRunning = true;
    log.success(`${chalk.yellow("docker")} is up and running.`);
  } catch (error) {
    isRunning = false;
    log.error(`${chalk.yellow("docker")} is not running.`);
    throw error;
  }

  return isRunning;
};

export const getComposeOptions = async (): Promise<IDockerComposeOptions> => {
  let composeOptions: IDockerComposeOptions;
  if (process.platform != "win32") {
    let res;
    try {
      res = execSync(`docker-compose -v`, {
        stdio: ["pipe", "pipe", "ignore"],
      });
    } catch (err) {}

    if (!res) {
      composeOptions = {
        executablePath: "docker",
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
      executablePath: "docker",
      log: true,
      composeOptions: ["compose", "-p"],
    };
  }

  return composeOptions;
};

export const prepareToStartContainers = async (
  projectName: string,
  composeOptions: IDockerComposeOptions
): Promise<void> => {
  log.wait(
    `Stopping [if any] already running resources for project ${chalk.yellow(
      projectName
    )}`
  );

  const downResponse: IDockerComposeResult = await dockerCompose.down({
    ...composeOptions,
    commandOptions: ["--remove-orphans"],
  });

  if (downResponse.err) {
    log.success(
      `No running resources found to stop for project ${chalk.yellow(
        projectName
      )}`
    );
  } else {
    log.success(
      `Successfully stopped all running resources for project ${chalk.yellow(
        projectName
      )}`
    );
  }
};

const prepareMongoDb = async (
  godspeedOptions: PlainObject,
  composeOptions: IDockerComposeOptions
) => {
  const { mongodb } = godspeedOptions;
  if (mongodb) {
    log.wait(`Setting up MongoDB replica cluster.`);
    const responseUpMany: IDockerComposeResult = await dockerCompose.upMany(
      [`mongodb1`, `mongodb2`, `mongodb3`],
      composeOptions
    );

    const responseExec: IDockerComposeResult = await dockerCompose.exec(
      `mongodb1`,
      "bash /scripts/mongodb_rs_init.sh",
      composeOptions
    );
    log.success(`Successfully setup MongoDB replica cluster.`);
  }
};

const generatePrismaClients = async (
  composeOptions: IDockerComposeOptions,
  projectDirPath: string
) => {
  return new Promise((resolve, reject) => {
    glob(
      path.resolve(projectDirPath, "src/datasources/*.prisma"),
      async (err, matches) => {
        if (err) {
          console.log(err);
          reject(err);
        } else {
          if (matches.length) {
            log.wait("Generating client for prisma datasources.");

            try {
              const responseUpOne: IDockerComposeResult =
                await dockerCompose.upAll(composeOptions);

              const responseExec: IDockerComposeResult =
                await dockerCompose.exec(
                  `node`,
                  [
                    "/bin/bash",
                    "-c",
                    "for i in src/datasources/*.prisma; do npx --yes prisma generate --schema $i && npx --yes prisma db push --schema $i; done",
                  ],
                  composeOptions
                );
            } catch (error) {
              console.log(error);
            }
            log.success(
              "Successfully generated client for prisma datasources."
            );
          }
          resolve("");
        }
      }
    );
  });
};

export const buildContainers = async (
  projectName: string,
  godspeedOptions: PlainObject,
  composeOptions: IDockerComposeOptions,
  projectDirPath: string
) => {
  try {
    log.wait(`Building containers for project ${projectName}`);
    console.log(JSON.stringify(composeOptions));
    await dockerCompose.buildAll(composeOptions);
    log.success(
      `Successfully build all containers for project ${chalk.yellow(
        projectName
      )}`
    );

    await prepareMongoDb(godspeedOptions, composeOptions);

    await generatePrismaClients(composeOptions, projectDirPath);

    await dockerCompose.stop(composeOptions);
  } catch (error) {
    console.log(error);
  }
};
