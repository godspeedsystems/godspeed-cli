declare let mongoDbName: string;
declare let postgresDbName: string;
declare let incMongo: boolean;
export declare function createDockerCompose(projectName: string, devcontainerDir: string): void;
export { incMongo, mongoDbName, postgresDbName };
