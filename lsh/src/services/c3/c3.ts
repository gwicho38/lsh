import { Command } from "commander";
import { loadCommands } from "../../util/lib.util.js";
import { ExecException } from "child_process";
import { makePOSTRequest } from "../../services/api/api.js";

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
        console.log(commands[commandName]());
        const res = await c3IsAvailable();
        console.log(res);
      })
      .description("commandName")
      .usage(`${commandName} used as follows:`);
  }

  cmd
    .showHelpAfterError("Command not recognized, here's some help.")
    .showSuggestionAfterError(true);

  return cmd;
}

export async function c3IsAvailable(): Promise<boolean> {
  const cb = (data: any) => {
    console.log(typeof (data));
    console.log(data);
    console.log(JSON.stringify(data));
  }

  const response = makePOSTRequest('Pkg', 'inst', {}, cb);
  if (response) {
    console.log(response);
  }
  return false;
}
