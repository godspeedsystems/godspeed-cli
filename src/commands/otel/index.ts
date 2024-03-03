import { Command } from "commander";
import spawnSync from "cross-spawn";
import path from "path";
import { readFile, writeFile } from "fs/promises"
import fs from "fs";
import ora from 'ora';
// const projectDirPath = path.resolve(process.cwd(), projectName);
    
const program = new Command();
const spinner = ora({
  text: 'Installing packages... ',
  spinner: {
  frames: ['🌍 ', '🌎 ', '🌏 ', '🌐 ', '🌑 ', '🌒 ', '🌓 ', '🌔 '],
    interval: 180,
  },
});

const enableAction = async () => {
    // install that package
    async  function installtracing(tracing:any) {
      try {
        spinner.start();
    
        const child = spawnSync('npm', ['install', `${tracing}`, '--quiet', '--no-warnings', '--silent', '--progress=false'], {
          stdio: 'inherit',
        });
    
        await new Promise<void>((resolve) => {
          child.on('close', () => {
            resolve();
          });
        });
    
        spinner.stop();
        console.log('\notel installed successfully!');
      } catch (error:any) {
        spinner.stop();
        console.error('Error during installation:', error.message);
      }
    }
      
      // Call the installPlugin function
      try {
        const envFilePath = path.join(process.cwd(), ".env");
        let envFileContents = await readFile(envFilePath, "utf-8");
    
        // Check if OTEL_ENABLED is already set to true
        if (envFileContents.includes("OTEL_ENABLED=true")) {
          await installtracing("@godspeedsystems/tracing");
          console.log("Observability is already enabled in the project.");
          return;
        } else if (envFileContents.includes("OTEL_ENABLED=false")) {
          envFileContents = envFileContents.replace("OTEL_ENABLED=false", "OTEL_ENABLED=true");
        } else {
          envFileContents += "\nOTEL_ENABLED=true";
        }
        
        // Enable OTEL by updating the .env file
        await installtracing("@godspeedsystems/tracing");
        await writeFile(envFilePath, envFileContents, "utf-8");
        console.log(`Observability has been enabled`);       
      } catch (error:any) {
        console.error(`Error enabling Observability: ${error.message}`);
      }
  };


  const disableAction = async () => {
    // uninstall that package
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
    
        spinner.stop();
        console.log('\notel uninstalled successfully!');
      } catch (error:any) {
        spinner.stop();
        console.error('Error during uninstallation:', error.message);
      }
    }
      
      // Call the uninstallPlugin function
  
    try {
      const envFilePath = path.join(process.cwd(), ".env");
      let envFileContents = await readFile(envFilePath, "utf-8");
  
      // Check if OTEL_ENABLED is already set to false
      if (envFileContents.includes("OTEL_ENABLED=false")) {
        await uninstalltracing("@godspeedsystems/tracing");
        console.log("Observability is already disabled.");
        return;
      } else if(envFileContents.includes("OTEL_ENABLED=true")) {
        envFileContents = envFileContents.replace("OTEL_ENABLED=true", "OTEL_ENABLED=false");
      } else {
        envFileContents += "\nOTEL_ENABLED=false";
      }
      await uninstalltracing("@godspeedsystems/tracing");
      await writeFile(envFilePath, envFileContents, "utf-8");
      console.log(`Observability has been disabled in the project`);
    
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