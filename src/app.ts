import { Command } from 'commander';
import axios from 'axios';
import { test } from './services/zapier.js'; // js extension because https://stackoverflow.com/questions/44979976/how-to-resolve-node-js-es6-esm-modules-with-the-typescript-compiler-tsc-tsc/70682797#70682797
import { init_c3 } from './services/c3/c3.js'; // js extension because https://stackoverflow.com/questions/44979976/how-to-resolve-node-js-es6-esm-modules-with-the-typescript-compiler-tsc-tsc/70682797#70682797
import { init_shell } from './services/shell/shell.js';
const program = new Command();

program
  .version('1.0.0')
  .description('c3sh | extendable cli client.')
  .name('c3sh');

init_c3(program);
// init_ishell(program); TODO: Implement interactive shell

program
  .command('ran_i')
  .description('return a random integer')
  .action(() => console.log(Math.floor(Math.random() * (9999999 - 0 + 1)) + 0))

program
  .command('zt')
  .description('tests zappier integration')
  .action(() =>
    test()
  );

program.parse(process.argv)

