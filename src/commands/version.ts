import path from "path";
import { replaceInFile } from "replace-in-file";

import fs from "fs";
import { PlainObject } from "../common";
import prepareContainers from "../utils/prepareContainers";

export default async function (version: string, composeOptions: PlainObject) {
  let gs: any;
  try {
    gs = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), ".godspeed"), "utf-8")
    );
  } catch (ex) {
    console.error("Run version command from Project Root", ex);
    process.exit(1);
  }

  composeOptions.cwd = ".devcontainer";
  composeOptions.composeOptions.push(`${gs.projectName}_devcontainer`);

  replaceInFile({
    files: ".devcontainer/Dockerfile",
    from: /adminmindgrep\/gs_service:.*/,
    to: `adminmindgrep/gs_service:${version}`,
  })
    .then(async (changedFiles) => {
      if (!changedFiles[0].hasChanged) {
        console.log(`Version Not changed to ${version}`);
      } else {
        try {
          await prepareContainers(
            gs.projectName,
            version,
            ".devcontainer",
            composeOptions,
            gs.mongodb,
            gs.postgresql
          );
        } catch (ex) {
          console.error("Run prepare command from Project Root", ex);
        }
        console.log(`Version changed to ${version}`);
      }
    })
    .catch((error: Error) => {
      console.error("Error occurred:", error);
    });
}
