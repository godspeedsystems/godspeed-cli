import { PlainObject } from './common';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { ask, prompt } from './utils';

let mongoDbName:string = 'test';
let postgresDbName:string = 'test';
let incMongo = false;

/*
* function to create docker-compose.yml file inside projectName/.devcontainer/ directory
*/
export function createDockerCompose(projectName: string, devcontainerDir: string) {
    let dockerComposeJson: PlainObject;
    const volumeObj: PlainObject = {};
    const dockerComposePath = path.resolve(devcontainerDir,'docker-compose.yml');
  
    // Create a dockerComposeJson object with default configuration
    dockerComposeJson = {
      "version": "3.7",
      "services": {
        [`${projectName}_node`]: {
          "command": "bash -c \"/scripts/node_init.sh && sleep infinity\"",
          "build": {
            "context": "./"
          },
          "environment": [
            "SHELL=/bin/bash"
          ],
          "volumes": [
            "..:/workspace/development/app:cached",
            "./scripts:/scripts"
          ],
          "working_dir": "/workspace/development/app",
          "ports": [
            "3000:3000"
          ],
          "networks": [
            `${projectName}_network`
          ]
          }
      },
      "networks": {
        [`${projectName}_network`]: {
          "driver": "bridge"
        }
      } 
    };
   
    // Ask and check if mongodb is required. If yes, then add mongodb configuration in dockerComposeJson else skip it.
    incMongo = ask('Do you need mongodb? [y/n] ');
    if (incMongo) {
      mongoDbName = prompt('Please enter name of the mongo database [default: test] ') || 'test';
      dockerComposeJson.services[`${projectName}_mongodb1`] = {
        "image": "mongo:5.0",
        "volumes": [
          `${projectName}_mongodb1-data:/data/db`,
          "./scripts:/scripts"
        ],
        "ports": [
          "27017:27017"
        ],
        "links": [
          `${projectName}_mongodb2`,
          `${projectName}_mongodb3`
        ],
        "restart": "always",
        "entrypoint": [
          "/usr/bin/mongod",
          "--keyFile",
          "/scripts/mongo-keyfile",
          "--bind_ip_all",
          "--replSet",
          "gs_service"
        ],
        "networks": [
          `${projectName}_network`
        ]
      };
      dockerComposeJson.services[`${projectName}_mongodb2`] = {
        "image": "mongo:5.0",
        "volumes": [
          `${projectName}_mongodb2-data:/data/db`,
          "./scripts:/scripts"
        ],
        "ports": [
          "27018:27017"
        ],
        "restart": "always",
        "entrypoint": [
          "/usr/bin/mongod",
          "--keyFile",
          "/scripts/mongo-keyfile",
          "--bind_ip_all",
          "--replSet",
          "gs_service"
        ],
        "networks": [
          `${projectName}_network`
        ]
      };
      dockerComposeJson.services[`${projectName}_mongodb3`] = {
        "image": "mongo:5.0",
        "volumes": [
          `${projectName}_mongodb3-data:/data/db`,
          "./scripts:/scripts"
        ],
        "ports": [
          "27019:27017"
        ],
        "restart": "always",
        "entrypoint": [
          "/usr/bin/mongod",
          "--keyFile",
          "/scripts/mongo-keyfile",
          "--bind_ip_all",
          "--replSet",
          "gs_service"
        ],
        "networks": [
          `${projectName}_network`
        ]
      };
      dockerComposeJson.services[`${projectName}_node`].environment.push(`MONGO_TEST_URL=mongodb://admin:mindgrep@${projectName}_mongodb1,${projectName}_mongodb2,${projectName}_mongodb3:27017/${mongoDbName}`); 
      volumeObj[`${projectName}_mongodb1-data`] = null;
      volumeObj[`${projectName}_mongodb2-data`] = null;
      volumeObj[`${projectName}_mongodb3-data`] = null;
    }
  
    // Ask and check if postgresdb is required. If yes, then add postgresdb configuration in dockerComposeJson else skip it.
    const incPostgres = ask('Do you need postgresdb? [y/n] ');
    if (incPostgres) {
      postgresDbName = prompt('Please enter name of the postgres database [default: test] ') || 'test';
      dockerComposeJson.services[`${projectName}_postgresdb`] = {
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
          `${projectName}_postgresql-data:/var/lib/postgresql/data`
        ],
        "networks": [
          `${projectName}_network`
        ]
      };
      dockerComposeJson.services[`${projectName}_node`].environment.push(`POSTGRES_URL=postgresql://postgres:postgres@${projectName}_postgresdb:5432/${postgresDbName}`); 
      volumeObj[`${projectName}_postgresql-data`] = null;
    }
  
    // Ask and check if kafka is required. If yes, then add kafka configuration in dockerComposeJson else skip it.
    const incKafka = ask('Do you need kafka? [y/n] ');
    if (incKafka) {
      dockerComposeJson.services[`${projectName}_zookeeper`] = {
        "image": "docker.io/bitnami/zookeeper:3.8",
        "ports": [
          "2181:2181"
        ],
        "environment": [
          "ALLOW_ANONYMOUS_LOGIN=yes"
        ],
        "networks": [
          `${projectName}_network`
        ]
      };
      dockerComposeJson.services[`${projectName}_kafka`] = {
        "image": "docker.io/bitnami/kafka:3.1",
        "ports": [
          "9092:9092"
        ],
        "environment": [
          `KAFKA_CFG_ZOOKEEPER_CONNECT=${projectName}_zookeeper:2181`,
          "ALLOW_PLAINTEXT_LISTENER=yes",
          `KAFKA_ZOOKEEPER_CONNECT=${projectName}_zookeeper:2181`,
          "KAFKA_LISTENERS=INTERNAL://0.0.0.0:9092,OUTSIDE://0.0.0.0:9094",
          "KAFKA_ADVERTISED_LISTENERS=INTERNAL://kafka:9092,OUTSIDE://localhost:9094",
          "KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=INTERNAL:PLAINTEXT,OUTSIDE:PLAINTEXT",
          "KAFKA_INTER_BROKER_LISTENER_NAME=INTERNAL"
        ],
        "depends_on": [
          `${projectName}_zookeeper`
        ],
        "networks": [
          `${projectName}_network`
        ]
      };
    }
  
    // Ask and check if elastisearch is required. If yes, then add elastisearch configuration in dockerComposeJson else skip it.
    const incElastisearch = ask('Do you need elastisearch? [y/n] ');
    if (incElastisearch) {
      dockerComposeJson.services[`${projectName}_elasticsearch`] = {
        "image": "docker.elastic.co/elasticsearch/elasticsearch:7.14.0",
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
          `${projectName}_elasticsearch-data:/usr/share/elasticsearch/data`
        ],
        "ports": [
          "9200:9200"
        ],
        "networks": [
          `${projectName}_network`
        ]
      };
      volumeObj[`${projectName}_elasticsearch-data`] = null;
    }
  
    // Ask and check if redis is required. If yes, then add redis configuration in dockerComposeJson else skip it.
    const incRedis = ask('Do you need redis? [y/n] ');
    if (incRedis) {
      dockerComposeJson.services[`${projectName}_redis`] = {
        "image": "redis:7.0",
        "environment": [
          "ALLOW_EMPTY_PASSWORD=yes",
          "REDIS_DISABLE_COMMANDS=FLUSHDB,FLUSHALL"
        ],
        "ports": [
          "6379:6379"
        ],
        "networks": [
          `${projectName}_network`
        ]
      };
    }
  
    //Add volumeObj to dockerComposeJson.volumes
    dockerComposeJson.volumes = volumeObj;
    //console.log('dockerComposeJson: ',dockerComposeJson);
    let yamlStr = yaml.dump(dockerComposeJson);
    //console.log(yamlStr.replaceAll('null',''));
    fs.writeFileSync(dockerComposePath, yamlStr.replaceAll('null',''), 'utf8');
  }

export { incMongo, mongoDbName, postgresDbName };
  