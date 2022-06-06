"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dockerCompose_1 = require("./dockerCompose");
/*
* function to create mongodb_rs_init.sh file inside projectName/.devcontainer/ directory
*/
function createMongodbRsInit(projectName, devcontainerDir) {
    const mongodbRsInitPath = path_1.default.join(devcontainerDir, '/scripts/mongodb_rs_init.sh');
    let mongodbRsInitString = `#!/bin/bash
mongosh <<EOF
var config = {
    "_id": "gs_service",
    "version": 1,
    "members": [
        {
            "_id": 1,
            "host": "${projectName}_mongodb1:27017",
            "priority": 1
        },
        {
            "_id": 2,
            "host": "${projectName}_mongodb2:27017",
            "priority": 0
        },
        {
            "_id": 3,
            "host": "${projectName}_mongodb3:27017",
            "priority": 0
        }
    ]
};
rs.initiate(config, { force: true });
rs.status();
exit
EOF

echo "Bootstrapping Mongodb cluster";
sleep 10
echo "Bootstrapping complete";
mongosh <<EOF
    use admin;
    admin = db.getSiblingDB("admin");
    admin.createUser(
        {
        user: "admin",
        pwd: "mindgrep",
        roles: [
             "clusterAdmin",
             { role: "root", db: "admin" }
            ]
        });
        db.getSiblingDB("admin").auth("admin", "mindgrep");
        rs.status();
        exit
EOF

mongosh  mongodb://admin:mindgrep@${projectName}_mongodb1,${projectName}_mongodb2,${projectName}_mongodb3/admin <<EOF
    use ${dockerCompose_1.mongoDbName};
    db.collection.insertOne({});
EOF

mongosh  mongodb://admin:mindgrep@${projectName}_mongodb1,${projectName}_mongodb2,${projectName}_mongodb3/admin <<EOF
   use ${dockerCompose_1.mongoDbName};
   ${dockerCompose_1.mongoDbName} = db.getSiblingDB("${dockerCompose_1.mongoDbName}");
   ${dockerCompose_1.mongoDbName}.createUser(
     {
	user: "admin",
        pwd: "mindgrep",
        roles: [ { role: "readWrite", db: "${dockerCompose_1.mongoDbName}" }]
     });
     exit
EOF
`;
    fs_1.default.writeFileSync(mongodbRsInitPath, mongodbRsInitString, 'utf8');
}
exports.default = createMongodbRsInit;
