import { pluginAdd } from "./add";
import { pluginRemove } from "./remove";
import { exec } from "child_process";
import { describe, it, before } from "mocha";
import * as fs from "fs";

export const plugin = () => {
  describe("Godspeed CLI Test Suite for plugin command", function () {
    this.timeout(0);
    const folderName = "godspeed";
    const tempDirectory = "sandbox";

    before(function (done) {
      fs.mkdirSync(tempDirectory, { recursive: true });
      // Execute your CLI command that creates a folder
      const command = `cd ${tempDirectory} && node ../lib/index.js create ${folderName}`;
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing CLI: ${error}`);
          return done(error); // Pass the error to done() to fail the test
        }
        done();
      });
    });
    pluginAdd();
    pluginRemove();

    after(function () {
      // Cleanup the temporary directory after the test suite
      fs.rmSync(tempDirectory, { recursive: true, force: true });
    });
  });
};
