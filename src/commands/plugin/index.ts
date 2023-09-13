import { Command } from "commander";
import path from "path";
import { homedir } from 'node:os';
import fs, { mkdirSync, writeFileSync } from "fs";
import { spawnSync } from "child_process";
import inquirer from "inquirer";
import * as yaml from 'js-yaml';
const program = new Command();

const list = program
  .command("list")
  .description(
    `List all available godspeed plugins.`
  )
  .action(async () => {
    // fetch the list of packages, maybe from the plugins repository
    let npmSearch = spawnSync("npm", ["search", `@godspeedsystems/plugins`, '--json'], { encoding: 'utf-8' });
    let availablePlugins: [{ name: string, description: string, version: string }] | [] = JSON.parse(npmSearch.stdout) || [];

    let result = availablePlugins.map(({ name, description, version }) => ({ name, description, version }));

    // list all the packages starting with plugins
    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "gsPlugin",
        message: "Please select godspeed plugin to install.",
        default: "latest",
        choices: result,
        loop: false,
      }
    ]);

    // install that package
    spawnSync('npm', ['install', `${answer.gsPlugin}`], { stdio: "inherit" })

    // call the add action with pluginName
    await addAction(answer.gsPlugin);
  });
// instance check

type ModuleType = 'DS' | 'ES' | 'BOTH';

const addAction = async (pluginName: string) => {
  // create folder for eventsource or datasource respective file
  try {
    const Module = await import(path.join(process.cwd(), 'node_modules', pluginName));

    let moduleType = Module.SourceType as ModuleType;
    let loaderFileName = Module.Type as string;
    let yamlFileName = Module.CONFIG_FILE_NAME as string;
    let defaultConfig = Module.DEFAULT_CONFIG || {} as PlainObject;

    switch (moduleType) {
      case 'BOTH': {
        mkdirSync(path.join(process.cwd(), 'src', 'eventsources', 'types'), { recursive: true });
        mkdirSync(path.join(process.cwd(), 'src', 'datasources', 'types'), { recursive: true });

        writeFileSync(path.join(process.cwd(), 'src', 'eventsources', 'types', `${loaderFileName}.ts`), `
      import { EventSource } from '${pluginName}';
      export default EventSource;
          `);
        writeFileSync(path.join(process.cwd(), 'src', 'eventsources', `${yamlFileName}.yaml`), yaml.dump({ type: loaderFileName, ...defaultConfig }));

        writeFileSync(path.join(process.cwd(), 'src', 'datasources', 'types', `${loaderFileName}.ts`), `
      import { DataSource } from '${pluginName}';
      export default DataSource;
          `);
        writeFileSync(path.join(process.cwd(), 'src', 'datasources', `${yamlFileName}.yaml`), yaml.dump({ type: loaderFileName, ...defaultConfig }));
      }
        break;
      case 'DS': {
        mkdirSync(path.join(process.cwd(), 'src', 'datasources', 'types'), { recursive: true });
        writeFileSync(path.join(process.cwd(), 'src', 'datasources', 'types', `${loaderFileName}.ts`), `
        import { DataSource } from '${pluginName}';
        export default DataSource;
            `);
        // special case for prisma for now
        // @ts-ignore
        if (Module.Type !== 'prisma') {
          writeFileSync(path.join(process.cwd(), 'src', 'datasources', `${yamlFileName}.yaml`), yaml.dump({ type: loaderFileName, ...defaultConfig }));
        }
      }
        break;
      case 'ES': {
        mkdirSync(path.join(process.cwd(), 'src', 'eventsources', 'types'), { recursive: true });
        writeFileSync(path.join(process.cwd(), 'src', 'eventsources', 'types', `${loaderFileName}.ts`), `
        import { EventSource } from '${pluginName}';
        export default EventSource;
            `);
        writeFileSync(path.join(process.cwd(), 'src', 'eventsources', `${yamlFileName}.yaml`), yaml.dump({ type: loaderFileName, ...defaultConfig }));
      }
    }
  } catch (error) {
    console.error('unable to import the module.', error);
  }
}

const add = program
  .command("add")
  .description(
    `Add a godspeed plugin.`
  )
  .argument("<pluginName>", "name of the plugin.")
  .action(async (pluginName) => {
    await addAction(pluginName);
  });

const remove = program
  .command("remove")
  .argument("<pluginName>", "name of the plugin.")
  .description(
    `Remove a godspeed plugin.`
  )
  .action(async (pluginName) => {
    try {

    } catch (error) {
    }
  });

const update = program
  .command("update")
  .argument("<pluginName>", "name of the plugin.")
  .description(
    `Update a godspeed devops plugin.`
  )
  .action(async (pluginName) => {
    try {
    } catch (error) {
    }
  });


export default { list, add, remove, update };