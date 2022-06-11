import promptSync from 'prompt-sync';

export const prompt = promptSync();

/*
* function to prompt question for User input
*/
export function ask(ques: string): boolean {
    const answer = prompt(ques + '[default: n] ');
    if (answer.toLowerCase() == 'y') {
        return true;
    } else {
        return false;
    }
}
