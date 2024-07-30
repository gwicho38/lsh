import fs from 'fs';
import path from 'path';
import glob from 'glob';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

import * as shell from "shelljs";
// const c3 = https://gkev8genai.c3-e.com/cor0202407191535/gurusearchui/remote/c3.js

export function cmd_rand(): number {
  return Math.random();
}

export function cmd_c3test(): number {
  return Math.random();
}

export function cmd_shelltest(): void {
  shell.echo("cmd_shelltest");
}

export function dummy(): number {
  return 1;
}

export async function cmd_bootstrap_action_runtimes() {

  console.log(`⏳️ Checking for ActionRuntime dependencies to sync.`);

  const globOptions = {
    cwd: process.env?.PWD || "",
    absolute: true,
  };

  // const globPattern = 'packages/**/nodejs-webpack_*.json';
  // const actionRuntimeFilepaths = glob.sync(globPattern, globOptions);
  const actionRuntimeFilepaths: string = "/Users/lefv/repos/lsh/lsh/lib/c3/runtimes/nodejs-webpack_c3.json";

}