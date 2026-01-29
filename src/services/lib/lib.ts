import { Command } from "commander";
import { getFiles } from "../../util/lib.util.js";


async function parseCommands(files: string[]) {
  const commands = {};

  for (const file of files) {
    if (file !== "lib.ts") {
      const cmd_exports = await import(`./${file.split(".")[0]}.js`);
      for (const [key, value] of Object.entries(cmd_exports)) {
        if (key.indexOf("cmd") !== -1) {
          commands[key.split("cmd_")[1]] = value;
        }
      }
    }
  }

  return commands;
}


export async function loadCommands() {
  const files = await getFiles();
  const cmdMap = await parseCommands(files);
  return cmdMap;
}




export async function init_lib(program: Command) {
  const lib = program
    .command("lib")
    .description("⚠️  DEPRECATED: Use top-level commands instead (daemon, cron, api, supabase)");

  // Load and register dynamic commands
  const commands = await loadCommands();
  for (const commandName of Object.keys(commands)) {
    lib
      .command(commandName)
      .action(async () => {
        console.log(commands[commandName]());
      })
      .description("commandName")
      .usage(`${commandName} used as follows:`);
  }

  // Show deprecation warning when 'lib' is used
  lib.hook('preAction', (_thisCommand, _actionCommand) => {
    console.warn('\x1b[33m⚠️  WARNING: "lsh lib" commands are deprecated as of v1.0.0\x1b[0m');
    console.warn('\x1b[33m   Use top-level commands instead:\x1b[0m');
    console.warn('\x1b[33m   - lsh daemon (instead of lsh lib daemon)\x1b[0m');
    console.warn('\x1b[33m   - lsh cron (instead of lsh lib cron)\x1b[0m');
    console.warn('\x1b[33m   - lsh api (instead of lsh lib api)\x1b[0m');
    console.warn('\x1b[33m   - lsh supabase (instead of lsh lib supabase)\x1b[0m');
    console.warn('');
  });

  // Optional: Enhance the 'lib' command group with additional descriptions and error handling
  lib
    .showHelpAfterError("Command not recognized, here's some help.")
    .showSuggestionAfterError(true);

  return lib;
}
