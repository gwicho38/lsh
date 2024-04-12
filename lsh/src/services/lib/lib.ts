import { Command } from "commander";
import { loadCommands } from "../../util/lib.util.js";

export async function init_lib_cmd(program: Command) {
  program
    .command("lib <cmd> [...options]")
    .description("lsh lib commands")
    .action(async (type: String, action: String, spec: Spec) => {
        const commands = await loadCommands();
        console.log(commands);
    });
}
