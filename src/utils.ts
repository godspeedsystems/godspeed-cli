import promptSync from "prompt-sync";
import { spawn, spawnSync } from "child_process";

export const prompt = promptSync();

/*
 * function to prompt question for User input
 */
export function ask(ques: string): boolean {
  const answer = prompt(ques + "[default: n] ");
  if (answer.toLowerCase() == "y") {
    return true;
  } else {
    return false;
  }
}

export function userID(): string {
  if (process.platform == "linux") {
    console.log("platform linux");
    const cmd = spawnSync("id", ["-u"]);
    const uid = cmd.stdout?.toString().trim();
    return uid;
  } else {
    return "1000";
  }
}
