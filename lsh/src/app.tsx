import { Command } from 'commander';
import { init_lib } from './cmds/lib/lib.js';
import { init_ishell } from './cmds/shell/shell.js';
import { init_c3 } from './cmds/c3/c3.js';

const program = new Command();

program
  .version('0.0.0')
  .description('lsh | extensible cli client.')
  .name('lsh')
  // .addHelpText('after', "<> required\n[] optional");

await init_ishell(program);
await init_lib(program);
await init_c3(program);

program.parse(process.argv);
