import { expect, assert } from "chai";
import { exec } from "child_process";
import { describe, it, before } from "mocha";
import * as fs from "fs";
import path from "path";

export const helloWorld = () => {
  describe("For create command with --from-example hello-world", function () {
    this.timeout(0);
    const folderName = "hello-world";
    const exampleName = "hello-world";
    const tempDirectory = "sandbox";
    let cliOp: string; // Declare cliOp outside before() to make it accessible

    before(function (done) {
      // Execute your CLI command that creates a folder
      const command = `cd ${tempDirectory} && node ../lib/index.js create ${folderName} --from-example ${exampleName}`;
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing CLI: ${error}`);
          return done(error); // Pass the error to done() to fail the test
        }
        cliOp = stdout; // Assign the result to cliOp
        done();
      });
    });

    it("Cloning a template", function () {
      expect(cliOp).not.to.include("Not able to reach template repository.");
    });

    it("Creating a project folder", () => {
      const folderPath = path.join(process.cwd(), tempDirectory, folderName);
      const folderExists = fs.existsSync(folderPath);
      expect(folderExists).to.be.true;
    });

    it("Generating project files", function () {
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

    it("Installing project dependencies", function () {
      // expect(cliOp).to.include("Successfully installed project dependencies");
      const folderPath = path.join(process.cwd(), tempDirectory, folderName);
      // Check if the "node_modules" subfolder exists within the project folder
      const datasourcesPath = path.join(folderPath, "node_modules");
      assert.isTrue(
        fs.existsSync(datasourcesPath),
        "node_modules folder exists."
      );
      // Check if the "package.json" subfolder exists within the project folder
      const packageJsonPath = path.join(folderPath, "package.json");
      assert.isTrue(
        fs.existsSync(packageJsonPath),
        "package.json folder exists."
      );

      // check is .swcrc file exists
      const swcrcPath = path.join(folderPath, ".swcrc");
      assert.isTrue(fs.existsSync(swcrcPath), ".swcrc file exists.");
    });
  });
};
