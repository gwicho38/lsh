import { Command } from 'commander';

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

    });
}
