import * as fs from "fs";
import { dirname, join } from "path";
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


export async function getFiles() {
  // Build path relative to this file's location
  // This file is at dist/util/lib.util.js, so services/lib is at ../services/lib/
  const libPath = join(__dirname, '../services/lib');
  return await fs.promises.readdir(libPath);
}

