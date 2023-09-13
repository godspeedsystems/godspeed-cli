import inquirer from "inquirer";
import { Command } from "commander";

export { type };
const demo = async () => {
  const program = new Command();
  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "platform",
      message: `Platform?`,
      default: "nodejs",
      choices: [{ name: 'NodeJS', value: 'nodejs' }, { name: 'Java', value: 'java' }]
    },
    {
      type: "list",
      name: "field",
      message: `New project(green filed) or Alredy existing project(brown field)?`,
      default: "green",
      choices: [{ name: 'New project', value: 'green' }, { name: 'Already existing Express + Node application', value: 'brown' }]
    }
  ]);
};

export default demo;