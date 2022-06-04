import { PlainObject } from './common';
import fs from 'fs';
import path from 'path';

/*
* function to create devcontainer.json file inside projectName/.devcontainer/ directory
*/
export default function createDevContainerJson(projectName: string, devcontainerDir: string) {
    const devcontainerPath = path.resolve(devcontainerDir,'devcontainer.json');
    let devContainerJson: PlainObject = {
        "name": `${projectName}`,
        "forwardPorts": [3000],
        "remoteUser": "node",
        "settings": {
          "terminal.integrated.profiles.linux": {
            "node bash": {
              "path": "/bin/bash"
            }
          },
          "terminal.integrated.defaultProfile.linux": "node bash",
          "debug.node.autoAttach": "disabled"
        },
        "dockerComposeFile": "./docker-compose.yml",
        "service": `${projectName}_node`,
        "workspaceFolder": "/workspace/development/app",
        "shutdownAction": "stopCompose",
        "features": {
          "git": "os-provided",
          "git-lfs": "latest",
          "github-cli": "latest"
        },    
        "extensions": [
        "dbaeumer.vscode-eslint",
        "emeraldwalk.RunOnSave"
        ]
    };
    fs.writeFileSync(devcontainerPath,JSON.stringify(devContainerJson,null,2), 'utf8');
  
  }
  