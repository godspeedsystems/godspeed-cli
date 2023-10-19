import { Command } from "commander";
import spawnSync from "cross-spawn";
import path from "path";
import { readFile, writeFile } from "fs/promises"
import fs, {
  existsSync,
  mkdirSync,
  readFileSync,
  readSync,
  writeFileSync,
} from "fs";
import { execSync } from "child_process";
import inquirer from "inquirer";
import * as yaml from "js-yaml";
import { cwd } from "process";
import chalk from "chalk";
import ora from 'ora';
// const projectDirPath = path.resolve(process.cwd(), projectName);
    
const program = new Command();

const enableAction = async () => {
    // install that package
    const spinner = ora({
      text: 'Installing packages... ',
      spinner: {
      frames: ['🌍 ', '🌎 ', '🌏 ', '🌐 ', '🌑 ', '🌒 ', '🌓 ', '🌔 '],
        interval: 180,
      },
    });
  
  
      async  function installtracing(tracing:any) {
        try {
          spinner.start();
      
          // Use spawnCommand instead of spawnSync
          const child = spawnSync('npm', ['install', `${tracing}`, '--quiet', '--no-warnings', '--silent', '--progress=false'], {
            stdio: 'inherit', // Redirect output
          });
      
          await new Promise<void>((resolve) => {
            child.on('close', () => {
              resolve();
            });
          });
      
          spinner.stop(); // Stop the spinner when the installation is complete
          console.log('\notel installed successfully!');
        } catch (error:any) {
          spinner.stop(); // Stop the spinner in case of an error
          console.error('Error during installation:', error.message);
        }
      }
      
      // Call the installPlugin function
      await installtracing("@godspeedsystems/tracing");
  
      try {
        const envFilePath = path.join(process.cwd(), ".env");
        let envFileContents = await readFile(envFilePath, "utf-8");
    
        // Check if OTEL_ENABLED is already set to true
        if (envFileContents.includes("OTEL_ENABLED=true")) {
          console.log("Observability is already enabled in the project.");
          return;
        }else if (envFileContents.includes("OTEL_ENABLED=false")) {
          const updatedData = envFileContents.replace("OTEL_ENABLED=false", "OTEL_ENABLED=true");

        // Write the modified contents back to the .env file
        fs.writeFile('.env', updatedData, (writeErr) => {
          if (writeErr) {
            console.error("Error writing to .env file:", writeErr);
          } else {
            console.log("Observability has been enabled");
          }
        })
        }else{
          envFileContents += "OTEL_ENABLED=true";
          await writeFile(envFilePath, envFileContents, "utf-8");
          console.log(`Observability has been enabled`);
        }
        
        // Enable OTEL by updating the .env file
       
      } catch (error:any) {
        console.error(`Error enabling Observability: ${error.message}`);
      }
  };


  const disableAction = async () => {
    // install that package
    const spinner = ora({
      text: 'Uninstalling packages... ',
      spinner: {
      frames: ['🌍 ', '🌎 ', '🌏 ', '🌐 ', '🌑 ', '🌒 ', '🌓 ', '🌔 '],
        interval: 180,
      },
    });
  
  
      async  function uninstalltracing(tracing:any) {
        try {
          spinner.start();
      
          // Use spawnCommand instead of spawnSync
          const child = spawnSync('npm', ['uninstall', `${tracing}`, '--quiet', '--no-warnings', '--silent', '--progress=false'], {
            stdio: 'inherit', // Redirect output
          });
      
          await new Promise<void>((resolve) => {
            child.on('close', () => {
              resolve();
            });
          });
      
          spinner.stop(); // Stop the spinner when the installation is complete
          console.log('\notel uninstalled successfully!');
        } catch (error:any) {
          spinner.stop(); // Stop the spinner in case of an error
          console.error('Error during uninstallation:', error.message);
        }
      }
      
      // Call the installPlugin function
      await uninstalltracing("@godspeedsystems/tracing");
  
      try {
        const envFilePath = path.join(process.cwd(), ".env");
        let envFileContents = await readFile(envFilePath, "utf-8");
    
        // Check if OTEL_ENABLED is already set to false
        if (envFileContents.includes("OTEL_ENABLED=false")) {
          console.log("Observability is already disabled.");
          return;
        }else if(envFileContents.includes("OTEL_ENABLED=true")){
          const updatedData = envFileContents.replace("OTEL_ENABLED=true", "OTEL_ENABLED=false");
        // Write the modified contents back to the .env file
        fs.writeFile('.env', updatedData, (writeErr) => {
          if (writeErr) {
            console.error("Error writing to .env file:", writeErr);
          } else {
            console.log("Observability has been disabled.");
          }
        })
        }else{
          envFileContents += "\nOTEL_ENABLED=false";
          await writeFile(envFilePath, envFileContents, "utf-8");
          console.log(`Observability has been disabled in the project`);
        }
        
      } catch (error:any) {
        console.error(`Error disabling Observability: ${error.message}`);
      }
  };


const enable = program
  .command("enable")
  .description(`enable Observability in project.`)
  .action(async () => {
    enableAction()
  })

  const disable = program
  .command("disable")
  .description(`disable Observability in project.`)
  .action(async () => {
    disableAction()
  })

  export default { enable, disable };