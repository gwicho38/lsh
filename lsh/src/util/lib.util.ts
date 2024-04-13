import * as fs from "fs";
import * as path from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * @example
 *
 * Example usage: Load commands from a specified directory asynchronously
 * loadCommands('./path/to/directory').then(commandDict => {
 *   console.log(commandDict);
 * }).catch(error => {
 *   console.error('Failed to load commands:', error);
 * });
 * Example usage: Load commands from a specified directory
 * const commandDict = loadCommands('./path/to/directory');
 * console.log(commandDict);
 *
 * @param directory
 * @returns @type CommandDictionary
 */

export interface CommandDictionary {
  [filename: string]: Function[];
}

export async function loadCommands() {
  const commands: CommandDictionary = {};
//   const currentFile = path.basename(__filename);
  // console.log(path.basename(__filename));
  // console.log(__dirname);
  const currentFile = "lib.ts"; 
  const directory = __dirname;
  // console.log(currentFile);

  // Read the directory asynchronously
  const files = await fs.promises.readdir("./src/services/lib/");
  console.log(files);

  files.forEach((file) => {
    const fullFilePath = path.join(directory, file);
    console.log(file);
    if (file !== currentFile && file.endsWith(".ts")) {
      console.log(file);
      try {
        const fileExports = require(fullFilePath);
        console.log(fileExports);

        // Check each export to see if it's a function and starts with "cmd_"
        const validFunctions: Function[] = [];
        Object.keys(fileExports).forEach((exportKey) => {
          const potentialFunction = fileExports[exportKey];
          if (
            typeof potentialFunction === "function" &&
            exportKey.startsWith("cmd_")
          ) {
            validFunctions.push(potentialFunction);
          }
        });

        if (validFunctions.length > 0) {
          commands[file] = validFunctions;
        }
      } catch (error) {
        console.error(`Error importing ${file}: ${error}`);
      }
      return { result: 200 };
    }
    return fullFilePath;
  });
}

//   // Use Promise.all to handle multiple asynchronous operations concurrently

//   return commands;
// }
