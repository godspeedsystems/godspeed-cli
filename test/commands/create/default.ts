import { expect, assert } from "chai";
import { exec } from "child_process";
import { describe, it, before } from "mocha";
import * as fs from "fs";
import path from "path";

export const defaultCreate = () => {
  describe("Godspeed CLI Test Suite for create command", function () {
    this.timeout(0);
    const folderName = "godspeed";
    const tempDirectory = "sandbox";
    let cliOp: string; // Declare cliOp outside before() to make it accessible

    before(function (done) {
      fs.mkdirSync(tempDirectory, { recursive: true });
      // Execute your CLI command that creates a folder
      const command = `cd ${tempDirectory} && node ../lib/index.js create ${folderName}`;
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing CLI: ${error}`);
          return done(error); // Pass the error to done() to fail the test
        }
        cliOp = stdout; // Assign the result to cliOp
        done();
      });
    });

    after(function () {
      // Cleanup the temporary directory after the test suite
      fs.rmSync(tempDirectory, { recursive: true, force: true });
    });

    it("Cloning a template", () => {
      expect(cliOp).not.to.include("Not able to reach template repository.");
    });

    it("Creating a project folder", () => {
      const folderPath = path.join(process.cwd(), tempDirectory, folderName);
      const folderExists = fs.existsSync(folderPath);
      expect(folderExists).to.be.true;
    });

    it("Generating project files", () => {
      expect(cliOp).to.include(
        `Successfully generated godspeed project files.`
      );
      const folderPath = path.join(process.cwd(), tempDirectory, folderName);
      // Check if the main folder exists
      assert.isTrue(fs.existsSync(folderPath), "Main folder exists.");

      // Check if the "src" subfolder exists within the main folder
      const srcPath = path.join(folderPath, "src");
      assert.isTrue(fs.existsSync(srcPath), "src folder exists.");

      // Check if the "eventsource" subfolder exists within the "src" folder
      const eventsourcePath = path.join(srcPath, "eventsources");
      assert.isTrue(
        fs.existsSync(eventsourcePath),
        "eventsourcesfolder exists."
      );

      // Check if the "events" subfolder exists within the "src" folder
      const eventsPath = path.join(srcPath, "events");
      assert.isTrue(fs.existsSync(eventsPath), "events folder exists.");

      // Check if the "functions" subfolder exists within the "src" folder
      const functionsPath = path.join(srcPath, "functions");
      assert.isTrue(fs.existsSync(functionsPath), "functions folder exists.");

      // Check if the "datasources" subfolder exists within the "src" folder
      const datasourcesPath = path.join(srcPath, "datasources");
      assert.isTrue(
        fs.existsSync(datasourcesPath),
        "datasources folder exists."
      );
    });

    it("Installing project dependencies", () => {
      expect(cliOp).to.include("Successfully installed project dependencies");
      const folderPath = path.join(process.cwd(), tempDirectory, folderName);
      // Check if the "node_modules"  exists within the project folder
      const datasourcesPath = path.join(folderPath, "node_modules");
      assert.isTrue(
        fs.existsSync(datasourcesPath),
        "node_modules folder exists."
      );
      // Check if the "package.json"  exists within the project folder
      const packageJsonPath = path.join(folderPath, "package.json");
      assert.isTrue(
        fs.existsSync(packageJsonPath),
        "package.json folder exists."
      );
    });
  });
};
