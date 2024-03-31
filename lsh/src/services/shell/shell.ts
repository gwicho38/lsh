import { Command } from 'commander';
import * as repl from 'repl';
import { getLSH } from '../../store/store.js';

interface Spec {
  function: String
}

export async function get_ishell(type: String = "Jvm", spec: Spec = {function: "currentUsage"}) {

}

export async function init_shell_cmd(program: Command) {
  cmd_interactive(program);
}

async function cmd_interactive(program: Command) {
  program
  .command('interactive')
  .description('lsh interactive shell')
  .action(async (type: String, action: String, spec: Spec) => {
    repl.start({
      prompt: '> ',
      useGlobal: true // This allows access to global variables
    });

    global.LSH = getLSH();
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
