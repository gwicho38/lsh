import { Command } from "commander";
import { get, lsh, set } from "../../store/store.js";
import { getFiles } from "../../util/lib.util.js";

async function parseCommands(files: any) {
  let commands = {};

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

export async function init_lib_cmd(program: Command) {
  program
    .command("lib <cmd> [...options]")
    .description("lsh lib commands")
    .action(async (type: String, action: String, spec: Spec) => {
      const commands = await loadCommands();
      set(lsh.commands, commands);
      switch (type) {
        case "ls":
          console.log("lsh called");
          console.log(get(lsh.commands));
          break;
        default:
          console.log("default");
      }
    });
}
