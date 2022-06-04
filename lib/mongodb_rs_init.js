"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/*
* function to create mongodb_rs_init.sh file inside projectName/.devcontainer/ directory
*/
function createMongodbRsInit(projectName, devcontainerDir) {
    const mongodbRsInitPath = path_1.default.resolve(devcontainerDir, 'mongodb_rs_init.sh');
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

sleep 10
mongosh <<EOF
    use admin;
    admin = db.getSiblingDB("admin");
    admin.createUser(
        {
    user: "admin",
        pwd: "mindgrep",
        roles: [ { role: "clusterManager", db: "admin" } ]
        });
        db.getSiblingDB("admin").auth("admin", "mindgrep");
        rs.status();
        exit
EOF
`;
    fs_1.default.writeFileSync(mongodbRsInitPath, mongodbRsInitString, 'utf8');
}
exports.default = createMongodbRsInit;
