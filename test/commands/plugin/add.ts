import { expect, assert } from "chai";
import { exec, execSync } from "child_process";
import { describe, it, before } from "mocha";
import * as fs from "fs";
import path from "path";

export const pluginAdd = () => {
  describe("Godspeed CLI Test Suite for plugin add command", function () {
    this.timeout(0);
    const folderName = "godspeed";
    const tempDirectory = "sandbox";
    let cliOp: string; // Declare cliOp outside before() to make it accessible

    // const command = "npm search @godspeedsystems/plugins --json";
    // const stdout = execSync(command, { encoding: "utf-8" });
    // const availablePlugins = JSON.parse(stdout);
    const pluginsFilePath = path.resolve(__dirname, '../../../pluginsList.json');
    const pluginsData = fs.readFileSync(pluginsFilePath, { encoding: 'utf-8' });
    const availablePlugins = JSON.parse(pluginsData);

    const folderPath = path.join(process.cwd(), tempDirectory, folderName);
    const pluginNames = availablePlugins.map((plugin: any) => plugin.name);
    // checking installation of plugin in package.json
    for (const pluginName of pluginNames) {
      it(`Plugin ${pluginName} is listed in package.json.`, async () => {
        const pluginCommand = `cd ${folderPath} && node ../../lib/index.js plugin add ${pluginName}`;
        execSync(pluginCommand, { encoding: "utf-8", stdio: "ignore" });
        const pkgPath = path.join(folderPath, "package.json");
        const pkgContent = fs.existsSync(pkgPath)
          ? JSON.parse(fs.readFileSync(pkgPath, { encoding: "utf-8" }))
          : {};
        const dependencies = pkgContent.dependencies
          ? Object.keys(pkgContent.dependencies)
          : [];
        assert.isTrue(dependencies.includes(pluginName));
      });
    }
    // checking creation of respective filesin src for each plugin
    for (const pluginName of pluginNames) {
      it(`Plugin ${pluginName} is installed and respective files created `, async () => {
        const Module = await import(
          path.join(folderPath, "node_modules", pluginName)
        );
        type ModuleType = "DS" | "ES" | "BOTH";
        let moduleType = Module.SourceType as ModuleType;
        let loaderFileName = Module.Type as string;
        let yamlFileName = Module.CONFIG_FILE_NAME as string;
        switch (moduleType) {
          case "BOTH":
            {
              assert.isTrue(
                fs.existsSync(
                  path.join(
                    folderPath,
                    "src",
                    "eventsources",
                    "types",
                    `${loaderFileName}.ts`
                  )
                )
              );
              assert.isTrue(
                fs.existsSync(
                  path.join(
                    folderPath,
                    "src",
                    "eventsources",
                    `${yamlFileName}.yaml`
                  )
                )
              );
              assert.isTrue(
                fs.existsSync(
                  path.join(
                    folderPath,
                    "src",
                    "datasources",
                    "types",
                    `${loaderFileName}.ts`
                  )
                )
              );
              assert.isTrue(
                fs.existsSync(
                  path.join(
                    folderPath,
                    "src",
                    "datasources",
                    `${yamlFileName}.yaml`
                  )
                )
              );
            }
            break;
          case "DS":
            {
              assert.isTrue(
                fs.existsSync(
                  path.join(
                    folderPath,
                    "src",
                    "datasources",
                    "types",
                    `${loaderFileName}.ts`
                  )
                )
              );
              // special case for prisma for now
              // @ts-ignore
              if (Module.Type !== "prisma") {
                assert.isTrue(
                  fs.existsSync(
                    path.join(
                      folderPath,
                      "src",
                      "datasources",
                      `${yamlFileName}.yaml`
                    )
                  )
                );
              }
            }
            break;
          case "ES": {
            assert.isTrue(
              fs.existsSync(
                path.join(
                  folderPath,
                  "src",
                  "eventsources",
                  "types",
                  `${loaderFileName}.ts`
                )
              )
            );
            assert.isTrue(
              fs.existsSync(
                path.join(
                  folderPath,
                  "src",
                  "eventsources",
                  `${yamlFileName}.yaml`
                )
              )
            );
          }
        }
      });
    }
  });
};
