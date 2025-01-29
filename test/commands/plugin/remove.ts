import { expect, assert } from "chai";
import { exec, execSync } from "child_process";
import { describe, it, before } from "mocha";
import * as fs from "fs";
import path from "path";

// for plugin remove

export const pluginRemove = () => {
  describe("Godspeed CLI Test Suite for plugin remove command", function () {
    this.timeout(0);
    const folderName = "godspeed";
    const tempDirectory = "sandbox";

    // const command = "npm search @godspeedsystems/plugins --json";
    // const stdout = execSync(command, { encoding: "utf-8" });
    // const availablePlugins = JSON.parse(stdout);
    const pluginsFilePath = path.resolve(__dirname, '../../../pluginsList.json');
    const pluginsData = fs.readFileSync(pluginsFilePath, { encoding: 'utf-8' });
    const availablePlugins = JSON.parse(pluginsData);
    
    const folderPath = path.join(process.cwd(), tempDirectory, folderName);
    const pluginNames = availablePlugins.map((plugin: any) => plugin.name);
    for (const pluginName of pluginNames) {
      it(`Plugin ${pluginName} is removed from package.json.`, () => {
        const pluginCommand = `cd ${folderPath} && node ../../lib/index.js plugin remove ${pluginName}`;
        execSync(pluginCommand, { encoding: "utf-8", stdio: "ignore" });
        const pkgPath = path.join(folderPath, "package.json");
        const pkgContent = fs.existsSync(pkgPath)
          ? JSON.parse(fs.readFileSync(pkgPath, { encoding: "utf-8" }))
          : {};
        const dependencies = pkgContent.dependencies
          ? Object.keys(pkgContent.dependencies)
          : [];
        assert.isFalse(dependencies.includes(pluginName));
      });
    }

    for (const pluginName of pluginNames) {
      it(`Plugin ${pluginName} is uninstalled and respective files removed `, async () => {
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
              assert.isFalse(
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
              assert.isFalse(
                fs.existsSync(
                  path.join(
                    folderPath,
                    "src",
                    "eventsources",
                    `${yamlFileName}.yaml`
                  )
                )
              );
              assert.isFalse(
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
              assert.isFalse(
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
              assert.isFalse(
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
                assert.isFalse(
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
            assert.isFalse(
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
            assert.isFalse(
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
