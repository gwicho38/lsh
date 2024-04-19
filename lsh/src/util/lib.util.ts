import * as fs from "fs";
import { dirname } from "path";
import { stdout } from "process";
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

export async function getFiles(path: string) {
  return await fs.promises.readdir(path);
}

export async function loadCommands(baseCmd: string, path: string) {
  const files = await getFiles(path);
  const cmdMap = await parseCommands(baseCmd, files, path);
  return cmdMap;
}

async function parseCommands(baseCmd: string, files: any, path: string) {
  let commands = {};
  for (const file of files) {
    if (file !== baseCmd) {
      // TODO: Generalize further
      const cmd_exports = await import(`../services/${baseCmd.split(".")[0]}/${file.split(".")[0]}.js`);
      for (const [key, value] of Object.entries(cmd_exports)) {
        if (key.indexOf("cmd") !== -1) {
          commands[key.split("cmd_")[1]] = value;
        }
      }
    }
  }

  return commands;
}