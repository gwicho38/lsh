import { Command } from "commander";
import { loadCommands } from "../../util/lib.util.js";

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
      })
      .description("commandName")
      .usage(`${commandName} used as follows:`);
  }

  cmd
    .showHelpAfterError("Command not recognized, here's some help.")
    .showSuggestionAfterError(true);

  return cmd;
}
