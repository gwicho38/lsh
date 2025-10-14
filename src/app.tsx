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

// Show help without error when no command is provided
program.configureHelp({
  showGlobalOptions: true,
});

// Set exitOverride to prevent Commander from calling process.exit
program.exitOverride((err) => {
  // If showing help, exit cleanly
  if (err.code === 'commander.helpDisplayed' || err.code === 'commander.help') {
    process.exit(0);
  }
  throw err;
});

program.parse(process.argv);

// If no command was provided, show help and exit cleanly
if (process.argv.length <= 2) {
  program.help({ error: false });
}