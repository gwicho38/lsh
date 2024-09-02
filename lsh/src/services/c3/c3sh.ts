import fs from "fs";
import path from "path";
import glob from "glob";
import { promisify } from "util";
import { c3FunctionCall } from "./API";

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
  const actionRuntimeFilepaths: string =
    "/Users/lefv/repos/lsh/lsh/lib/c3/runtimes/nodejs-webpack_c3.json";
}

export async function cmd_migrate_genai() {}

// get all configs from target
async function getRetrieverInfo(refEnv: any) {
  const colbertRetrievers = c3FunctionCall(
    "Genai.Retriever.ColBERT",
    "fetch",
    {}
  );
  console.log(colbertRetrievers);
  // var colbertRetrievers = Genai.Retriever.ColBERT.fetch().objs;
  // return {
  //   colbertRetrievers: colbertRetrievers,
  //   colbertDataConfigs: colbertRetrievers.map((retriever: { name: any }) =>
  //     Genai.Retriever.ColBERT.DataConfig.forConfigKey(retriever.name)
  //   ),
  //   sourceCollections: Genai.SourceCollection.fetch().objs,
  //   chunkerConfig: Genai.SourceFile.Chunker.UniversalChunker.Config.inst(),
  // };
}

// get all configs from ref and set them on target
function setRetrieverInfo(refEnv: any, targetEnv: any) {
  // var colbertRetrievers = Genai.Retriever.ColBERT.fetch().objs;
  // return {
  //   colbertRetrievers: colbertRetrievers,
  //   colbertDataConfigs: colbertRetrievers.map((retriever: { name: any }) =>
  //     Genai.Retriever.ColBERT.DataConfig.forConfigKey(retriever.name)
  //   ),
  //   sourceCollections: Genai.SourceCollection.fetch().objs,
  //   chunkerConfig: Genai.SourceFile.Chunker.UniversalChunker.Config.inst(),
  // };
}
