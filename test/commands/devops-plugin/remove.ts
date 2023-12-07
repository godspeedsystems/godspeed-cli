import { expect, assert } from "chai";
import { exec, execSync } from "child_process";
import { describe, it, before } from "mocha";
import { homedir } from "node:os";
import * as fs from "fs";
import path from "path";

export const pluginRemove = () => {
  describe("Godspeed CLI Test Suite for devops-plugin remove command", function () {
    this.timeout(0);
    const command = "npm search @godspeedsystems/plugins --json";
    const stdout = execSync(command, { encoding: "utf-8" });
    const availablePlugins = JSON.parse(stdout);
    const pluginNames = availablePlugins.map((plugin: any) => plugin.name);
    // for (const pluginName of pluginNames) {
    //   it(`Plugin ${pluginName} is listed in package.json.`, () => {
    //     const pluginCommand = `node lib/index.js devops-plugin add ${pluginName}`;
    //     execSync(pluginCommand, { encoding: "utf-8", stdio: "ignore" });
    //     const gsDevopsPluginsDir = path.join(
    //       homedir(),
    //       ".godspeed",
    //       "devops-plugins"
    //     );
    //     const pkgPath = path.join(gsDevopsPluginsDir, "package.json");
    //     const pkgContent = fs.existsSync(pkgPath)
    //       ? JSON.parse(fs.readFileSync(pkgPath, { encoding: "utf-8" }))
    //       : {};
    //     const dependencies = pkgContent.dependencies
    //       ? Object.keys(pkgContent.dependencies)
    //       : [];
    //     assert.isTrue(dependencies.includes(pluginName));
    //   });
    // }
    for (const pluginName of pluginNames) {
      it(`devops-plugin ${pluginName} is uninstalled from ${path.join(
        homedir(),
        ".godspeed",
        "devops-plugins",
        "package.json"
      )}`, () => {
        const pluginCommand = `node lib/index.js devops-plugin remove ${pluginName}`;
        execSync(pluginCommand, { encoding: "utf-8", stdio: "ignore" });
        const gsDevopsPluginsDir = path.join(
          homedir(),
          ".godspeed",
          "devops-plugins"
        );
        const pkgPath = path.join(gsDevopsPluginsDir, "package.json");
        const pkgContent = fs.existsSync(pkgPath)
          ? JSON.parse(fs.readFileSync(pkgPath, { encoding: "utf-8" }))
          : {};
        const dependencies = pkgContent.dependencies
          ? Object.keys(pkgContent.dependencies)
          : [];
        assert.isFalse(dependencies.includes(pluginName));
      });
    }
  });
};
