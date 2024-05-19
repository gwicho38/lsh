import { Command } from "commander";
import {
  getAllTsFiles,
  loadCommands,
  searchTsFiles,
} from "../../util/lib.util.js";

export async function init_search(program: Command) {
  const cmd = program.command("search");
  const baseCmd = "search.ts";
  const path = process.env.LSH_CMD_SEARCH;

  // Load and register dynamic commands
  const commands = await loadCommands(baseCmd, path);
  const files = await searchTsFiles("const");
  for (const commandName of Object.keys(commands)) {
    cmd
      .command(commandName)
      .action(async () => {
        console.log(files);
      })
      .description("commandName")
      .usage(`${commandName} used as follows:`);
  }

  cmd
    .showHelpAfterError("Command not recognized, here's some help.")
    .showSuggestionAfterError(true);

  return cmd;
}
