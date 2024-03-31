import { Command } from 'commander';
import axios from 'axios';
import { init_c3_cmd } from './services/c3/c3.js'; // js extension because https://stackoverflow.com/questions/44979976/how-to-resolve-node-js-es6-esm-modules-with-the-typescript-compiler-tsc-tsc/70682797#70682797
import { init_shell_cmd } from './services/shell/shell.js';
const program = new Command();

program
  .version('0.0.0')
  .description('lsh | extensible cli client.')
  .name('lsh');

init_shell_cmd(program);
init_c3_cmd(program);

console.log("End");

program.parse(process.argv)

