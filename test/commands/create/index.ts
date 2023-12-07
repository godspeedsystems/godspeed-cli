import { defaultCreate } from "./default";
import { helloWorld } from "./hello-world";
import { mongoAsPrisma } from "./mongo-as-prisma";
import { describe, before } from "mocha";
import * as fs from "fs";

export const create = () => {
  // describe("Godspeed CLI Test Suite for create command", function () {
  //   this.timeout(0);
  //   const folderName = "godspeed";
  //   const tempDirectory = "sandbox";
  //   let cliOp: string; // Declare cliOp outside before() to make it accessible

  //   before(function (done) {
  //     fs.mkdirSync(tempDirectory, { recursive: true });
  //     done();
  //   });

  defaultCreate();
  helloWorld();
  mongoAsPrisma();

  // after(function (done) {
  //   // Cleanup the temporary directory after the test suite
  //   fs.rmSync(tempDirectory, { recursive: true, force: true });
  //   done();
  // });
  // });
};
