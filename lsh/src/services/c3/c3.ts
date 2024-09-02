import { Command } from "commander";
import { loadCommands } from "../../util/lib.util.js";
import { ExecException } from "child_process";
import { c3_exec as c3_exec } from "../../services/api/api.js";
import { prettyPrintJson, FormatOptions } from 'pretty-print-json';

export async function init_c3(program: Command) {
  const cmd = program.command("c3");
  const baseCmd = "c3.ts";
  const path = process.env.LSH_CMD_C3;

  // Load and register dynamic commands
  const commands = await loadCommands(baseCmd, path);
  for (const commandName of Object.keys(commands)) {
    cmd
      .command(commandName)
      .action(async () => {
        // console.log(commands[commandName]());
        const res = await bootC3();
        // console.log(res);
      })
      .description("commandName")
      .usage(`${commandName} used as follows:`);
  }

  cmd
    .showHelpAfterError("Command not recognized, here's some help.")
    .showSuggestionAfterError(true);

  return cmd;
}

// this is where response is obtained
// create dev environment - done
// create dev app - done 
// create start app spec - done
// start app - done
// install runtimes
// install c3sdk
// load c3types
// install impl languages
// ImplLanguage.Runtime.forName('js-webpack')
// NpmLibraryManager.mergedRuntime('js-webpack_c3')
// install runtimes
// configure appurl - AppUrl.make({ id: 'localhost:8888', env: 'dev', app: 'c3' })
// Configure Pkg.Store
// Initialize connection to Pkg.Store
// Start: Initialize c3typ Intellisense
// Initialize c3typ Intellisense. 
export async function bootC3(): Promise<any> {
  return c3_exec('Pkg', 'inst', {}) || {};
}

export async function startDevEnv(): Promise<any> {
  // takes Cluster.StartEnvSpec
  const spec = {
    waitForReady: true,
    serverVersion: process.env.C3_SERVER_VERSION,
    singleNode: true
  };
  return await c3_exec('Cluster', 'startEnv', spec);
}

export async function startDevApp(): Promise<any> {
  // takes  Env.StartAppSpec
  const spec = {
    name: "dev",
    rootPkg: "dev",
    mode: "dev",
    waitForReady: true,
    serverVersion: process.env.C3_SERVER_VERSION,
  };
  const env = await c3_exec('Env', 'forName', ['Env', 'c3']);
  return await c3_exec('Env', 'startApp', [env, spec]);
}

export async function assignAppUrl() {
  // create url configKey listConfigKeys
  // AppUrl.make({ id: 'localhost:8888', env: 'dev', app: 'c3' }).upsert()
}

// relevant runtimes
// const npm = NpmLibraryManager.inst()
// npm.ensureRuntimeInstalled()
// install in c3/c3
// js-webpack_c3
// js-client-browser
// js-server-node
// js-ide-vscode-client-node
// nodejs-webpack_c3

// install in dev app
// Js.Runtime.forName('js-ide-vscode-client-node')

const RUNTIMES = [
  'js-ide-vscode-client-node',
  'js-webpack_c3',
  'js-client-browser',
  'js-server-node',
  'nodejs-webpack_c3'
];

export async function installImplLanguages(): Promise<any> {
  /**
   * Pkg.setDevMode(true)
   * Pkg.liveMetadata() --> true
   * ImplLanguage.Runtime.forName('js-webpack')
   * NpmLibraryManager.mergedRuntime('js-webpack_c3')
   * output = c3.Py.upsertRuntime(custom_runtime)
   */
}

export async function installRuntimes(): Promise<any> {
  console.log(`⏳️ Install environment runtimes.`);
  // load npm library manager
  // takes NpmLibraryManager.Config
  // get npm --> NpmLibraryManager.inst()
  // npm.installRuntime(${})
  // for each rt in runtimes
  // const rt = Js.Runtime.forName('js-ide-vscode-client-node')
  // npm.ensureRuntimeInstalled(rt)
}

export async function resetServer(): Promise<any> {
  // var pkg = Pkg.Store.inst()
  // pkg.clearCaches();
  // Pkg.File.Db.removeAll({}, true)  // this means you need to re-sync, use only for clean start.
  // Server.restart()
}
