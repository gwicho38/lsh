import { Command } from "commander";
import { CommandDictionary, getFiles } from "../../util/lib.util.js";

async function getCommands(files: any) {
  console.log("getCommands");
  files.forEach(async (file: any) => {
    if (file !== "lib.ts") {
      const cmd_exports = await import(`./${file.split(".")[0]}.js`);
      for (const [key, value] of Object.entries(cmd_exports)) {
        if (key.indexOf("cmd") !== -1) {
          console.log(key.split("cmd_"));
          console.log(value);
        } 
      }
    }
  });
}

export async function loadCommands() {
  console.log("loadCommands");
  const files = await getFiles();
  getCommands(files);
  const commands: CommandDictionary = {};
}

export async function init_lib_cmd(program: Command) {
  program
    .command("lib <cmd> [...options]")
    .description("lsh lib commands")
    .action(async (type: String, action: String, spec: Spec) => {
      const commands = await loadCommands();
    });
}
