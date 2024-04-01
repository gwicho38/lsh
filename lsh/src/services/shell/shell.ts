import { Command } from 'commander';
import repl from 'repl';
import { $ } from 'zx';

interface Spec {
  function: String
}

export async function get_ishell(type: String = "Jvm", spec: Spec = { function: "currentUsage" }) {

}

export async function init_shell_cmd(program: Command) {
  cmd_interactive(program);
}

async function cmd_interactive(program: Command) {
  program
    .command('repl')
    .description('lsh interactive shell')
    .action(async (type: String, action: String, spec: Spec) => {
      repl.start({
        prompt: '> ',
        useGlobal: true // This allows access to global variables
      });

      await $`ls -l`

      // // global.LSH = getShell();
      // const rl = readline.createInterface({
      //   input: process.stdin,
      //   output: process.stdout
      // });

      // const prompt = (): void => {
      //   rl.question('Enter command: ', (input: string) => {
      //     if (input === 'exit') {
      //       console.log('Exiting interactive shell...');
      //       rl.close();
      //       return;
      //     }

      //     console.log(`You entered: ${input}`);
      //     prompt(); // Re-prompt the user
      //   });
      // };

      // prompt();

    });
}
