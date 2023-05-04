import promptSync from "prompt-sync";
import { spawnSync } from "child_process";
import { PlainObject } from "./common";
import fs from "fs";
import ejs from "ejs";

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

export function askNew(question: string, defaultValue: string) {
  const answer = prompt(`${question} `);
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

export const generateFileFromTemplate = (
  templateFilePath: string,
  pathToSaveFileWithFileName: string,
  templateData: PlainObject
) => {
  const template = ejs.compile(fs.readFileSync(templateFilePath, "utf-8"));

  fs.writeFileSync(pathToSaveFileWithFileName, template(templateData));
};
