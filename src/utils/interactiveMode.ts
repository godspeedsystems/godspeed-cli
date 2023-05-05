import inquirer from "inquirer";

export default async () => {
  const answers = await inquirer.prompt([
    {
      type: "confirm",
      name: "mongodb",
      message: "Do you want mongoDB as database?",
      default: false,
    },
    {
      type: "list",
      name: "mongodb.mode",
      message: "Do you want to enable replication for MongoDB?",
      default: { name: "Single Mode [for development]", value: "single" },
      choices: [
        { name: "Single Mode [for Development]", value: "single" },
        { name: "Cluster Mode [for Production]", value: "cluster" },
      ],
      when: (answers) => !!answers.mongodb,
    },
    {
      type: "input",
      name: "mongodb.dbname",
      message: "What do you want to name your MongoDB database?",
      default: "godspeed",
      when: (answers) => !!answers.mongodb,
    },
    {
      type: "input",
      name: "mongodb.ports[0]",
      message: "Please enter the port for MongoDB node.",
      default: 27017,
      when: (answers) => (answers.mongodb.mode === "single" ? true : false),
    },
    {
      type: "input",
      name: "mongodb.ports[0]",
      message: "Please enter the port for MongoDB node[1].",
      default: 27017,
      when: (answers) => (answers.mongodb.mode === "cluster" ? true : false),
    },
    {
      type: "input",
      name: "mongodb.ports[1]",
      message: "Please enter the port for MongoDB node[2].",
      default: 27018,
      when: (answers) => (answers.mongodb.mode === "cluster" ? true : false),
    },
    {
      type: "input",
      name: "mongodb.ports[2]",
      message: "Please enter the port for MongoDB node[3].",
      default: 27019,
      when: (answers) => (answers.mongodb.mode === "cluster" ? true : false),
    },
    {
      type: "confirm",
      name: "postgresql",
      message: "Do you want to use PostgreSQL as database?",
      defalut: false,
    },
    {
      type: "input",
      name: "postgresql.dbname",
      message: "What will be the name of PostgreSQL database?",
      default: "godspeed",
      when: (answers) => !!answers.postgresql,
    },
    {
      type: "input",
      name: "postgresql.port",
      message: "What will be the port of PostgreSQL database?",
      default: "5432",
      when: (answers) => !!answers.postgresql,
    },
    {
      type: "confirm",
      name: "kafka",
      message: "Do you want to use Apache Kafka?",
      default: false,
    },
    {
      type: "input",
      name: "kafka.port",
      message: "Please enter kafka port.",
      default: 9092,
      when: (answers) => !!answers.kafka,
    },
    {
      type: "input",
      name: "kafka.port",
      message: "Please enter zookeeper port.",
      default: 2181,
      when: (answers) => !!answers.kafka,
    },
    {
      type: "confirm",
      name: "elasticsearch",
      message: "Do you want to use elasticgraph?",
      default: false,
    },
    {
      type: "input",
      name: "elasticgraph.port",
      message: "Please enter elasticgraph port.",
      default: 9200,
      when: (answers) => !!answers.elasticgraph,
    },
    {
      type: "confirn",
      name: "redis",
      message: "Do you want to use Redis as database?",
      default: false,
    },
    {
      type: "input",
      name: "redis.dbname",
      message: "Please enter Redis database name.",
      default: "godspeed",
      when: (answers) => !!answers.redis,
    },
    {
      type: "input",
      name: "redis.port",
      message: "Please enter the Redis port?",
      default: 6379,
      when: (answers) => !!answers.redis,
    },
    {
      type: "input",
      name: "servicePort",
      message: "Please enter host port on which you want to run your service.",
      default: 3000,
    },
  ]);

  return answers;
};
