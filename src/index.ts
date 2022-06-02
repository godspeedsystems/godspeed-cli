#!/usr/bin/env node

import chalk from 'chalk';
import figlet from 'figlet';
import program from 'commander';

import promptSync from 'prompt-sync';
const prompt = promptSync();

/*
  function to init gs_project_template
*/
function gs_init() {
  const incMongo = ask('Do you need mongo? [y/n] ');
  console.log('incMongo: ', incMongo);

  const incPostgres = ask('Do you need postgres? [y/n] ');
  console.log('incPostgres: ', incPostgres);

  const incKafka = ask('Do you need kafka? [y/n] ');
  console.log('incKafka: ', incKafka);

  const incElastisearch = ask('Do you need elastisearch? [y/n] ');
  console.log('incElastisearch: ', incElastisearch);

  const incRedis = ask('Do you need redis? [y/n] ');
  console.log('incRedis: ', incRedis);
}

/*
  function to prompt question for User input
*/
function ask(ques: string): boolean {
  const answer = prompt(ques);
  const res = checkUserInput(answer.toLowerCase());
  if (res) {
    if ( answer.toLowerCase() == 'y' ) {
      return true;
    } else {
      return false;
    }
  } else {
    console.log('!! Invalid Input !! Exiting..');
    process.exit(1);
  }
}

/*
  function to check User input, returns false if input doesn't match with 'y' or 'n'
*/
function checkUserInput(userInput: string): boolean {
  if( userInput == 'y' || userInput == 'n' ) {
    return true;
  }
  return false;
}

//********************************************* */
// Main starts
async function main() {
    console.log(chalk.red(figlet.textSync('godspeed-cli', { horizontalLayout: 'full' })));

    program
      .version('1.0')
      .description("Godspeed CLI")
      .option('-b, --build', 'To build the project')
      .option('-i, --init', 'To initialize a project')
      .parse(process.argv);

    const options = program.opts();

    if (!process.argv.slice(2).length) {
      program.outputHelp();
    }

    if (options.build) console.log('  - build');

    // init function
    if (options.init) {
      gs_init();
    }
}

main();
