import { Command } from "commander";
import { loadCommands } from "../../util/lib.util.js";

// async function makeCommand(commander: Command) {
//   const commands = await loadCommands();
//   commander.command("jug").action(() => {
//     console.log("heat jug");
//   });
//   commander.command("pot").action(() => {
//     console.log("heat pot");
//   });

//   return commander;
// }

// export async function init_lib_cmd(program: Command) {
//   const brew = program.command("lib");
//   // const commands = await loadCommands();
//   // await set(lsh.commands, commands);
//   brew.command("tea").action(() => {
//     console.log("brew tea");
//   });
//   brew.command("coffee").action(() => {
//     console.log("brew coffee");
//   });
//   await makeCommand(brew);

//   // for (let c in commands) {
//   //   brew.command(c).action(() => console.log(c));
//   // }
//   // .command("lib").description("lsh lib commands");
//   // lib
//   // .showHelpAfterError(true)
//   // .showSuggestionAfterError(true);
//   // const commands = await loadCommands();
//   // set(lsh.commands, commands);
//   // for (const [key, value] of Object.entries(get(lsh.commands))) {
//   //   // console.log(`${key} : ${value}`);
//   //   lib.command(key).action(() => {console.log(value)});
//   // };

//   // .action(async (type: String, action: String, spec: Spec) => {
//   //   const commands = await loadCommands();
//   //   set(lsh.commands, commands);

//   //   switch (type) {
//   //     case "ls":
//   //       // console.log("lsh called");
//   //       // console.log(get(lsh.commands)['rand']());
//   //       break;
//   //     default:
//   //       console.log("default");
//   //   }
//   // });
// }

export async function init_lib(program: Command) {
  const lib = program.command("lib");
  const baseCmd = "lib.ts";
  const path = process.env.LSH_CMD_LIB;

  // Load and register dynamic commands
  const commands = await loadCommands(baseCmd, path);
  for (const commandName of Object.keys(commands)) {
    lib
      .command(commandName)
      .action(async () => {
        console.log(commands[commandName]());
      })
      .description("commandName")
      .usage(`${commandName} used as follows:`);
  }

  lib
    .showHelpAfterError("Command not recognized, here's some help.")
    .showSuggestionAfterError(true);

  return lib;
}
