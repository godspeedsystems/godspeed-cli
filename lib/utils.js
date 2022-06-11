"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ask = exports.prompt = void 0;
const prompt_sync_1 = __importDefault(require("prompt-sync"));
exports.prompt = (0, prompt_sync_1.default)();
/*
* function to prompt question for User input
*/
function ask(ques) {
    const answer = (0, exports.prompt)(ques + '[default: n] ');
    if (answer.toLowerCase() == 'y') {
        return true;
    }
    else {
        return false;
    }
}
exports.ask = ask;
