"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkUserInput = exports.ask = exports.prompt = void 0;
const prompt_sync_1 = __importDefault(require("prompt-sync"));
exports.prompt = (0, prompt_sync_1.default)();
/*
* function to prompt question for User input
*/
function ask(ques) {
    const answer = (0, exports.prompt)(ques);
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
exports.ask = ask;
/*
* function to check User input, returns false if input doesn't match with 'y' or 'n'
*/
function checkUserInput(userInput) {
    if (userInput == 'y' || userInput == 'n') {
        return true;
    }
    return false;
}
exports.checkUserInput = checkUserInput;
