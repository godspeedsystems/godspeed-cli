import { spawnSync } from "child_process";
import { Command } from "commander";
import { globSync } from "glob";
import path from "path";
import { isAGodspeedProject } from "../..";

const program = new Command();

const prepareAction = async () => {
  // scan the prisma files
  try {
    // find all the .prisma files
    const availablePrismaFiles = globSync(path.join(process.cwd(), "src/datasources/**/*.prisma"));
    if (availablePrismaFiles.length) {
      // generate prisma client for each file and perform db sync
      availablePrismaFiles.map((prismaFilePath => {
        const relativeFilePath = path.relative(process.cwd(), prismaFilePath);
        spawnSync('npx', ['--yes', 'prisma', 'generate', `--schema=${relativeFilePath}`], { stdio: 'inherit' });
        spawnSync('npx', ['--yes', 'prisma', 'db', 'push', `--schema=${relativeFilePath}`], { stdio: 'inherit' });
      }));
    } else {
      return;
    }
  } catch (error) {

  }
};

const prepare = program
  .command('prepare')
  .description("prepare your prisma database for use. (It generates your prisma client for database, and sync the database with the schema)")
  .action(async () => {
    if (isAGodspeedProject()) {
      await prepareAction();
    }
  });

export default { prepare };