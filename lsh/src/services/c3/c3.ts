import { Command } from "commander";
import { loadCommands } from "../../util/lib.util.js";
import { ExecException } from "child_process";
import { c3Request } from "../../services/api/api.js";
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
export async function bootC3(): Promise<any> {
  const cb = (data: any) => {
    console.log(data);
  }
  // create dev environment
  // create dev app
  // create start app spec
  // start app
  // install runtimes
  return c3Request('Pkg', 'inst', {}, cb) || {};

}

export async function bootstrapUi() {

}
