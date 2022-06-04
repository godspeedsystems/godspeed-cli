import promptSync from 'prompt-sync';

export const prompt = promptSync();

/*
* function to prompt question for User input
*/
export function ask(ques: string): boolean {
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
* function to check User input, returns false if input doesn't match with 'y' or 'n'
*/
export function checkUserInput(userInput: string): boolean {
    if( userInput == 'y' || userInput == 'n' ) {
        return true;
    }
    return false;
}
  