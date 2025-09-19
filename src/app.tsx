import { Command } from 'commander';
import { init_lib } from './services/lib/lib.js';
import { init_ishell } from './services/shell/shell.js';
import { init_supabase } from './services/supabase/supabase.js';
import { init_daemon } from './services/daemon/daemon.js';
import { init_cron } from './services/cron/cron.js';

const program = new Command();

program
  .version('0.0.0')
  .description('lsh | extensible cli client.')
  .name('lsh');


init_ishell(program);
init_lib(program);
init_supabase(program);
init_daemon(program);
init_cron(program);

program.parse(process.argv);