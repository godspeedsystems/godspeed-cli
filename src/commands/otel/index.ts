import { Command } from "commander";
import spawnSync from "cross-spawn";
import path from "path";
import { readFile, writeFile } from "fs/promises"
import ora from 'ora';
// const projectDirPath = path.resolve(process.cwd(), projectName);
    
const program = new Command();

const enableAction = async () => {
  // install that package
  const spinner = ora({
    text: 'Installing plugin... ',
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
        console.log('\ntracing installed successfully!');
      } catch (error:any) {
        spinner.stop(); // Stop the spinner in case of an error
        console.error('Error during installation:', error.message);
      }
    }
    
    // Call the installPlugin function
    await installtracing("@godspeedsystems/tracing");

    try {
      const envFilePath = path.join(process.cwd(), '.env');
      
      let envFileContents = await readFile(envFilePath, "utf-8");
  
      // Check if OTEL_ENABLED is already set to true
      if (envFileContents.includes("OTEL_ENABLED=true")) {
        console.log("OTEL is already enabled in the project.");
        return;
      }
      else if((envFileContents.includes("OTEL_ENABLED=false"))){

      }
      else{
        envFileContents += "\nOTEL_ENABLED=true";
        await writeFile(envFilePath, envFileContents, "utf-8");
    
        console.log(`OTEL has been enabled in the project`);
        
      }
      // Enable OTEL by updating the .env file
     
    } catch (error:any) {
      console.error(`Error enabling OTEL: ${error.message}`);
    }
};


const disbleAction = async () => {
  // install that package
  const spinner = ora({
    text: 'Uninstalling otel',
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
        console.log('\ntracing uninstalled successfully!');
      } catch (error:any) {
        spinner.stop(); // Stop the spinner in case of an error
        console.error('Error during uninstallation:', error.message);
      }
    }
    
    // Call the uninstallPlugin function
    await uninstalltracing("@godspeedsystems/tracing");

    try {
      const envFilePath = path.join(process.cwd(), '.env');

      let envFileContents = await readFile(envFilePath, "utf-8");
  
      // Check if OTEL_ENABLED is already set to true
      if (envFileContents.includes("OTEL_ENABLED=false")) {
        console.log("OTEL is already disabled in the project.");
        return;
      }
  
      // Enable OTEL by updating the .env file
      envFileContents += "\nOTEL_ENABLED=false";
      await writeFile(envFilePath, envFileContents, "utf-8");
  
      console.log(`OTEL has been disabled in the project`);
    } catch (error:any) {
      console.error(`Error disabling OTEL: ${error.message}`);
    }
};


const enable = program
  .command("enable")
  .description(`enable otel in project.`)
  .action(async () => {
    enableAction()
  })

  const disable = program
  .command("disable")
  .description(`disable otel in project.`)
  .action(async () => {
    disbleAction()
  })

  export default { enable, disable };