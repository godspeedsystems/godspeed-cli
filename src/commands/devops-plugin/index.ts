import { Command } from "commander";
const program = new Command();

const list = program
  .command("list")
  .description(
    `List all available godspeed devops plugins.`
  )
  .action(() => {
    
  });

const add = program
  .command("add")
  .description(
    `Add a godspeed devops plugin.`
  );

const remove = program
  .command("remove")
  .description(
    `Remove a godspeed devops plugin.`
  );

const update = program
  .command("update")
  .description(
    `Update a godspeed devops plugin.`
  );


export default { list, add, remove, update };