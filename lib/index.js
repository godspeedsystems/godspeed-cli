#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const figlet_1 = __importDefault(require("figlet"));
const commander_1 = __importDefault(require("commander"));
const prompt_sync_1 = __importDefault(require("prompt-sync"));
const prompt = (0, prompt_sync_1.default)();
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
function ask(ques) {
    const answer = prompt(ques);
    const res = checkUserInput(answer.toLowerCase());
    if (res) {
        if (answer.toLowerCase() == 'y') {
            return true;
        }
        else {
            return false;
        }
    }
    else {
        console.log('!! Invalid Input !! Exiting..');
        process.exit(1);
    }
}
/*
  function to check User input, returns false if input doesn't match with 'y' or 'n'
*/
function checkUserInput(userInput) {
    if (userInput == 'y' || userInput == 'n') {
        return true;
    }
    return false;
}
//********************************************* */
// Main starts
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(chalk_1.default.red(figlet_1.default.textSync('godspeed-cli', { horizontalLayout: 'full' })));
        commander_1.default
            .version('1.0')
            .description("Godspeed CLI")
            .option('-b, --build', 'To build the project')
            .option('-i, --init', 'To initialize a project')
            .parse(process.argv);
        const options = commander_1.default.opts();
        if (!process.argv.slice(2).length) {
            commander_1.default.outputHelp();
        }
        if (options.build)
            console.log('  - build');
        // init function
        if (options.init) {
            gs_init();
        }
    });
}
main();
