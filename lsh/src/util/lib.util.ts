import * as fs from "fs";
import { dirname } from "path";
import { stdout } from "process";
import { fileURLToPath } from "url";
import path from "path";
import Fuse from "fuse.js";
import ignore from "ignore";

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
      // all commands from js/ts
      const cmd_js_exports = await import(
        `../services/${baseCmd.split(".")[0]}/${file.split(".")[0]}.js`
      );
      for (const [key, value] of Object.entries(cmd_js_exports)) {
        if (key.indexOf("cmd") !== -1) {
          commands[key.split("cmd_")[1]] = value;
        }
      }
      // const cmd_shell_exports = await console.log("hi");
    }
  }

  return commands;
}

// Function to read and parse .gitignore
const parseGitignore = (baseDir) => {
  const ig = ignore();
  const gitignorePath = path.join(baseDir, ".gitignore");

  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, "utf8");
    ig.add(gitignoreContent);
  }

  return ig;
};

// Function to recursively get all TypeScript files in a directory excluding "d.ts", "dist" directory, and ".gitignore" patterns
const getAllTsFiles = (dir, ig, fileList = []) => {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const relativeFilePath = path.relative(process.cwd(), filePath);

    if (ig.ignores(relativeFilePath) || relativeFilePath.startsWith("dist")) {
      return;
    }

    if (fs.statSync(filePath).isDirectory()) {
      getAllTsFiles(filePath, ig, fileList);
    } else if (filePath.endsWith(".ts") && !filePath.endsWith("d.ts")) {
      fileList.push(filePath);
    }
  });
  return fileList;
};
