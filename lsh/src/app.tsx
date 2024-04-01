import { Command } from 'commander';
import { init_shell_cmd } from './services/shell/shell.js';

const program = new Command();

program
  .version('0.0.0')
  .description('lsh | extensible cli client.')
  .name('lsh');

init_shell_cmd(program);

program.parse(process.argv)
