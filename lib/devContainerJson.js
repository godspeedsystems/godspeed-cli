"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/*
* function to create devcontainer.json file inside projectName/.devcontainer/ directory
*/
function createDevContainerJson(projectName, devcontainerDir) {
    const devcontainerPath = path_1.default.resolve(devcontainerDir, 'devcontainer.json');
    let devContainerJson = {
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
    fs_1.default.writeFileSync(devcontainerPath, JSON.stringify(devContainerJson, null, 2), 'utf8');
}
exports.default = createDevContainerJson;
