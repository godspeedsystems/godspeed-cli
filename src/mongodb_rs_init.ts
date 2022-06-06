import fs from 'fs';
import path from 'path';
import { mongoDbName } from './dockerCompose';

/*
* function to create mongodb_rs_init.sh file inside projectName/.devcontainer/ directory
*/
export default function createMongodbRsInit(projectName: string, devcontainerDir: string) {
    const mongodbRsInitPath = path.join(devcontainerDir,'/scripts/mongodb_rs_init.sh');
    console.log('mongodbRsInitPath: ',mongodbRsInitPath);
    let mongodbRsInitString: string = `#!/bin/bash
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
            "userAdminAnyDatabase", "dbAdminAnyDatabase", "readWriteAnyDatabase",
             { role: "clusterManager", db: "admin" } ,
             { role: "readWrite", db: "${mongoDbName}" } 
            ]
        });
        db.getSiblingDB("admin").auth("admin", "mindgrep");
        rs.status();
        exit
EOF
`;    
    fs.writeFileSync(mongodbRsInitPath,mongodbRsInitString, 'utf8');
  
}
  