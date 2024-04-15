import { Command } from 'commander';
import { init_lib } from './services/lib/lib.js';
import { init_ishell } from './services/shell/shell.js';

const program = new Command();

program
  .version('0.0.0')
  .description('lsh | extensible cli client.')
  .name('lsh')
  .addHelpText('after', "<> required\n[] optional");

await init_ishell(program);
await init_lib(program);

program.parse(process.argv)
