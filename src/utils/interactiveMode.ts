import inquirer from "inquirer";
import axios, { type AxiosError } from "axios";
import { log } from "./signale";
import chalk from "chalk";

const fetchFrameworkVersionTags = async (): Promise<
  { name: string; value: string }[]
> => {
  let versions = [{ name: "latest", value: "latest" }];

  try {
    let response = await axios.get(
      `${process.env.DOCKER_REGISTRY_TAGS_VERSION_URL}`
    );
    versions = response.data.results.map((version: PlainObject) => ({
      name: version.name,
      value: version.name,
    }));
  } catch (err) {
    const error = err as Error | AxiosError;
    if (axios.isAxiosError(error)) {
      log.fatal(
        chalk.red(
          `Not able to connect docker registry. Please check your internet connection.`
        )
      );
      return versions;
    }
  }

  return versions;
};

const isAWord = (input: string): boolean | string => {
  if (input.length > 0 && input.split(/(\s+)/).length === 1) {
    return true;
  } else {
    return chalk.red(
      `${chalk.yellow(input)} is not a valid value. It should be a single word.`
    );
  }
};

const isAPort = (input: string): boolean | string => {
  const regexExp =
    /^((6553[0-5])|(655[0-2][0-9])|(65[0-4][0-9]{2})|(6[0-4][0-9]{3})|([1-5][0-9]{4})|([0-5]{0,5})|([0-9]{1,4}))$/gi;
  if (regexExp.test(input)) {
    return true;
  } else {
    return chalk.red(
      `${chalk.yellow(
        input
      )} is not a valid port. It should be a number between 0-65535.`
    );
  }
};

export default async (
  alreadyAnswered: GodspeedOptions | {},
  askAnswered: boolean = false
): Promise<GodspeedOptions> => {
  const versions = await fetchFrameworkVersionTags();
  console.log("\n");

  const answers = await inquirer.prompt(
    [
      {
        type: "confirm",
        name: "mongodb",
        message: `Do you want mongoDB as database?`,
        default: false,
        askAnswered: askAnswered,
      },
      {
        type: "input",
        name: "mongodb.dbName",
        message: "What do you want to name your MongoDB database?",
        default: "godspeed",
        when: (answers) => !!answers.mongodb,
        askAnswered: askAnswered,
        validate: isAWord,
      },
      {
        type: "input",
        name: "mongodb.ports[0]",
        message: "Please enter the port for MongoDB node[1].",
        default: 27017,
        when: (answers) => !!answers.mongodb,
        askAnswered: askAnswered,
        validate: isAPort,
      },
      {
        type: "input",
        name: "mongodb.ports[1]",
        message: "Please enter the port for MongoDB node[2].",
        default: 27018,
        when: (answers) => !!answers.mongodb,
        askAnswered: askAnswered,
        validate: isAPort,
      },
      {
        type: "input",
        name: "mongodb.ports[2]",
        message: "Please enter the port for MongoDB node[3].",
        default: 27019,
        when: (answers) => !!answers.mongodb,
        askAnswered: askAnswered,
        validate: isAPort,
      },
      {
        type: "confirm",
        name: "postgresql",
        message: "Do you want to use PostgreSQL as database?",
        default: false,
        askAnswered: askAnswered,
      },
      {
        type: "input",
        name: "postgresql.dbName",
        message: "What will be the name of PostgreSQL database?",
        default: "godspeed",
        when: (answers) => !!answers.postgresql,
        askAnswered: askAnswered,
        validate: isAWord,
      },
      {
        type: "input",
        name: "postgresql.port",
        message: "What will be the port of PostgreSQL database?",
        default: 5432,
        when: (answers) => !!answers.postgresql,
        askAnswered: askAnswered,
        validate: isAPort,
      },
      {
        type: "confirm",
        name: "kafka",
        message: "Do you want to use Apache Kafka?",
        default: false,
        askAnswered: askAnswered,
      },
      {
        type: "input",
        name: "kafka.kafkaPort",
        message: "Please enter kafka port.",
        default: 9092,
        when: (answers) => !!answers.kafka,
        askAnswered: askAnswered,
        validate: isAPort,
      },
      {
        type: "input",
        name: "kafka.zookeeperPort",
        message: "Please enter zookeeper port.",
        default: 2181,
        when: (answers) => !!answers.kafka,
        askAnswered: askAnswered,
        validate: isAPort,
      },
      {
        type: "confirm",
        name: "elasticsearch",
        message: "Do you want to use elasticgraph?",
        default: false,
        askAnswered: askAnswered,
      },
      {
        type: "input",
        name: "elasticgraph.port",
        message: "Please enter elasticgraph port.",
        default: 9200,
        when: (answers) => !!answers.elasticgraph,
        askAnswered: askAnswered,
        validate: isAPort,
      },
      {
        type: "confirm",
        name: "redis",
        message: "Do you want to use Redis as database?",
        default: false,
        askAnswered: askAnswered,
      },
      {
        type: "input",
        name: "redis.dbName",
        message: "Please enter Redis database name.",
        default: "godspeed",
        when: (answers) => !!answers.redis,
        askAnswered: askAnswered,
        validate: isAWord,
      },
      {
        type: "input",
        name: "redis.port",
        message: "Please enter the Redis port?",
        default: 6379,
        when: (answers) => !!answers.redis,
        askAnswered: askAnswered,
        validate: isAPort,
      },
      {
        type: "input",
        name: "servicePort",
        message:
          "Please enter host port on which you want to run your service.",
        default: 3000,
        askAnswered: askAnswered,
        validate: isAPort,
      },
      {
        type: "list",
        name: "gsNodeServiceVersion",
        message: "Please select gs-node-service(Godspeed Framework) version.",
        default: "latest",
        choices: versions,
        loop: false,
        askAnswered: askAnswered,
      },
    ],
    alreadyAnswered
  );
  console.log("\n");
  return answers;
};
