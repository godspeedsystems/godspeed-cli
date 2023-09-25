import { expect } from "chai";
import { exec } from "child_process";
import { describe } from "mocha";
import * as fs from "fs";

describe("Godspeed CLI Test Suite", function () {
  this.timeout(70000);
  it("should create a project", function (done) {
    const folderName = "godspeed";

    // Execute your CLI command that creates a folder
    const command = `node ../lib/src/index.js create ${folderName}`;

    exec(command, (error: Error | null, stdout: string, stderr: string) => {
      if (error) {
        console.error(`Error executing CLI: ${error}`);
        done(error);
        return;
      }

      // Check if the folder was created
      fs.stat(
        folderName,
        (err: NodeJS.ErrnoException | null, stats: fs.Stats) => {
          if (err) {
            console.error(`Error checking folder existence: ${err}`);
            done(err);
            return;
          }

          expect(stats.isDirectory()).to.be.true;
          done();
        }
      );
    });
  });
});
