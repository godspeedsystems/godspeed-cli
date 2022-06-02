#!/usr/bin/env node

const chalk = require('chalk');
const clear = require('clear');
const figlet = require('figlet');
const path = require('path');
const program = require('commander');

clear();
console.log(
  chalk.red(
    figlet.textSync('godspeed-cli', { horizontalLayout: 'full' })
  )
);

program
  .version('0.0.1')
  .description("An example CLI for ordering pizza's")
  .option('-b, --build', 'To build the project')
  .option('-i, --init', 'To initialize a project')
  .parse(process.argv);

const options = program.opts();

console.log('executing with:');
if (options.build) console.log('  - build');
if (options.init) console.log('  - init');

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
