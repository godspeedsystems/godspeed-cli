import chalk from "chalk";
import { isDockerRunning } from "./dockerUtility";
import { log } from "./signale";

export default async (): Promise<void> => {
  try {
    await isDockerRunning();
  } catch (error) {
    console.log(
      `\n${chalk.yellow("godspeed")} has dependency on ${chalk.yellow(
        "docker"
      )}. Seems like your docker deamon is not running.${chalk.red(
        ` Please run ${chalk.yellow("docker deamon")} first and then try again.`
      )}
      `
    );
    process.exit(0);
  }
};
