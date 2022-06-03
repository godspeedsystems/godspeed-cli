#!/usr/bin/env node
import chalk from 'chalk';
import figlet from 'figlet';
import program from 'commander';
import yaml from 'js-yaml';
import fs from 'fs';
import simpleGit from 'simple-git';

import promptSync from 'prompt-sync';
const prompt = promptSync();

interface PlainObject {
  [key: string]: any
}

/*
* function to init GS Project
*/
function GSInit(project_name: string) {

  const git = simpleGit();
  /*
  git().clone(remote)
  .then(() => console.log('finished'))
  .catch((err) => console.error('failed: ', err));
  */

  //Create a dockerComposeJson object with default configuration
  let dockerComposeJson: PlainObject;
  let volumeObj: PlainObject = {};
  dockerComposeJson = {
    "version": "3.7",
    "services": {
      "node": {
        "container_name": "node",
        "command": "bash -c \"/scripts/node_init.sh && sleep infinity\"",
        "build": {
          "context": "./"
        },
        "environment": [
          "SHELL=/bin/bash"
        ],
        "volumes": [
          "..:/workspace/development/app:cached",
          "./node_init.sh:/scripts/node_init.sh"
        ],
        "working_dir": "/workspace/development/app",
        "ports": [
          "3000:3000"
        ]
      }
    }
  };

  // Ask and check if mongodb is required. If yes, then add mongodb configuration in dockerComposeJson else skip it.
  const incMongo = ask('Do you need mongodb? [y/n] ');
  if (incMongo) {
    dockerComposeJson.services.mongodb1 = {
      "container_name": `${project_name}_mongodb1`,
      "image": "mongo:5.0",
      "volumes": [
        `${project_name}_mongodb1-data:/data/db`,
        "./mongodb_rs_init.sh:/scripts/mongodb_rs_init.sh",
        "./mongo-keyfile:/data/key/mongo-keyfile"
      ],
      "ports": [
        "27017:27017"
      ],
      "links": [
        "mongodb2",
        "mongodb3"
      ],
      "restart": "always",
      "entrypoint": [
        "/usr/bin/mongod",
        "--keyFile",
        "/data/key/mongo-keyfile",
        "--bind_ip_all",
        "--replSet",
        "gs_service"
      ]
    };
    dockerComposeJson.services.mongodb2 = {
      "container_name": `${project_name}_mongodb2`,
      "image": "mongo:5.0",
      "volumes": [
        `${project_name}_mongodb2-data:/data/db`,
        "./mongo-keyfile:/data/key/mongo-keyfile"
      ],
      "ports": [
        "27018:27017"
      ],
      "restart": "always",
      "entrypoint": [
        "/usr/bin/mongod",
        "--keyFile",
        "/data/key/mongo-keyfile",
        "--bind_ip_all",
        "--replSet",
        "gs_service"
      ]
    };
    dockerComposeJson.services.mongodb3 = {
      "container_name": `${project_name}_mongodb3`,
      "image": "mongo:5.0",
      "volumes": [
        `${project_name}_mongodb3-data:/data/db`,
        "./mongo-keyfile:/data/key/mongo-keyfile"
      ],
      "ports": [
        "27019:27017"
      ],
      "restart": "always",
      "entrypoint": [
        "/usr/bin/mongod",
        "--keyFile",
        "/data/key/mongo-keyfile",
        "--bind_ip_all",
        "--replSet",
        "gs_service"
      ]
    };
    volumeObj[`${project_name}_mongodb1-data:/data/db`] = null;
    volumeObj[`${project_name}_mongodb2-data:/data/db`] = null;
    volumeObj[`${project_name}_mongodb3-data:/data/db`] = null;
  }

  // Ask and check if postgresdb is required. If yes, then add postgresdb configuration in dockerComposeJson else skip it.
  const incPostgres = ask('Do you need postgresdb? [y/n] ');
  if (incPostgres) {
    dockerComposeJson.services.postgresdb = {
      "container_name": `${project_name}_postgresdb`,
      "image": "postgres:14.1-alpine",
      "restart": "always",
      "environment": [
        "POSTGRES_USER=postgres",
        "POSTGRES_PASSWORD=postgres"
      ],
      "ports": [
        "5432:5432"
      ],
      "volumes": [
        `${project_name}_postgresql-data:/var/lib/postgresql/data`
      ]
    };
    volumeObj[`${project_name}_postgresql-data:/data/db`] = null;
  }

  // Ask and check if kafka is required. If yes, then add kafka configuration in dockerComposeJson else skip it.
  const incKafka = ask('Do you need kafka? [y/n] ');
  if (incKafka) {
    dockerComposeJson.services.zookeeper = {
      "container_name": `${project_name}_zookeeper`,
      "image": "docker.io/bitnami/zookeeper:3.8",
      "ports": [
        "2181:2181"
      ],
      "environment": [
        "ALLOW_ANONYMOUS_LOGIN=yes"
      ]
    };
    dockerComposeJson.services.kafka = {
      "container_name": `${project_name}_kafka`,
      "image": "docker.io/bitnami/kafka:3.1",
      "ports": [
        "9092:9092"
      ],
      "environment": [
        "KAFKA_CFG_ZOOKEEPER_CONNECT=zookeeper:2181",
        "ALLOW_PLAINTEXT_LISTENER=yes",
        "KAFKA_ZOOKEEPER_CONNECT=zookeeper:2181",
        "KAFKA_LISTENERS=INTERNAL://0.0.0.0:9092,OUTSIDE://0.0.0.0:9094",
        "KAFKA_ADVERTISED_LISTENERS=INTERNAL://kafka:9092,OUTSIDE://localhost:9094",
        "KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=INTERNAL:PLAINTEXT,OUTSIDE:PLAINTEXT",
        "KAFKA_INTER_BROKER_LISTENER_NAME=INTERNAL"
      ],
      "depends_on": [
        "zookeeper"
      ]
    };
  }

  // Ask and check if elastisearch is required. If yes, then add elastisearch configuration in dockerComposeJson else skip it.
  const incElastisearch = ask('Do you need elastisearch? [y/n] ');
  if (incElastisearch) {
    dockerComposeJson.services.elastisearch = {
      "image": "docker.elastic.co/elasticsearch/elasticsearch:7.14.0",
      "container_name": `${project_name}_elasticsearch`,
      "environment": [
        "node.name=es01",
        "discovery.type=single-node",
        "bootstrap.memory_lock=true",
        "ES_JAVA_OPTS=-Xms512m -Xmx512m"
      ],
      "ulimits": {
        "memlock": {
          "soft": -1,
          "hard": -1
        }
      },
      "volumes": [
        `${project_name}_elasticsearch-data:/usr/share/elasticsearch/data`
      ],
      "ports": [
        "9200:9200"
      ]
    };
    volumeObj[`${project_name}_elasticsearch-data:/data/db`] = null;
  }

  // Ask and check if redis is required. If yes, then add redis configuration in dockerComposeJson else skip it.
  const incRedis = ask('Do you need redis? [y/n] ');
  if (incRedis) {
    dockerComposeJson.services.redis = {
      "container_name": `${project_name}_redis`,
      "image": "redis:7.0",
      "environment": [
        "ALLOW_EMPTY_PASSWORD=yes",
        "REDIS_DISABLE_COMMANDS=FLUSHDB,FLUSHALL"
      ],
      "ports": [
        "6379:6379"
      ]
    };
  }

  //Add volumeObj to dockerComposeJson.volumes
  dockerComposeJson.volumes = volumeObj;

  console.log('dockerComposeJson: ',dockerComposeJson);
  let yamlStr = yaml.dump(dockerComposeJson);
  console.log('docker-compose.yaml: ');
  console.log(yamlStr.replaceAll('null',''));
  fs.writeFileSync('docker-compose.yml', yamlStr.replaceAll('null',''), 'utf8');
}

/*
* function to prompt question for User input
*/
function ask(ques: string): boolean {
  const answer = prompt(ques);
  const res = checkUserInput(answer.toLowerCase());
  if (res) {
    if ( answer.toLowerCase() == 'y' ) {
      return true;
    } else {
      return false;
    }
  } else {
    console.log('!! Invalid Input !! Exiting..');
    process.exit(1);
  }
}

/*
* function to check User input, returns false if input doesn't match with 'y' or 'n'
*/
function checkUserInput(userInput: string): boolean {
  if( userInput == 'y' || userInput == 'n' ) {
    return true;
  }
  return false;
}

/*
* function to build GS project
*/
function GSBuild() {
  console.log('This is GSBuild.');
}

/************************************************/
async function main() {
    console.log(chalk.red(figlet.textSync('godspeed-cli', { horizontalLayout: 'full' })));

    program
      .version('1.0')
      .description("Godspeed CLI")
      .option('-b, --build', 'To build the project')
      .option('-i, --init <project_name>', 'To initialize a project')
      .parse(process.argv);

    const options = program.opts();

    if (!process.argv.slice(2).length) {
      program.outputHelp();
    }

    // build option
    if (options.build) {
      GSBuild();
    }

    // init option
    if (options.init) {
      const project_name: string = options.init;
      GSInit(project_name);
    }
}

main();
