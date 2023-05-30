type PlainObject = {
  [key: string]: any;
};

type MongoDB = {
  dbName: string;
  ports: [number];
};

type PostgresDB = {
  dbName: string;
  port: number;
};

type Kafka = {
  kafkaPort: number;
  zookeeperPort: number;
};

type ElasticSearch = {
  elasticsearchPort: number;
};

type Redis = {
  port: number;
};

interface GodspeedOptions {
  projectName: string;
  gsNodeServiceVersion: string;
  servicePort: number;
  mongodb: false | MongoDB;
  postgresql: false | PostgresDB;
  kafka: false | Kafka;
  elasticsearch: false | ElasticSearch;
  redis: false | Redis;
  userUID: number;
  meta: {
    createTimestamp: string;
    lastUpdateTimestamp: string;
    cliVersionWhileCreation: string;
    cliVersionWhileLastUpdate: string;
  };
}
