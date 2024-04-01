import { Command } from 'commander';
import { init_shell_cmd } from './services/shell/shell.js';
const program = new Command();

program
  .version('0.0.0')
  .description('lsh | extensible cli client.')
  .name('lsh');

init_shell_cmd(program);

console.log(program.opts());

program.parse(process.argv)
