// define imports
import { Command } from 'commander';
import stdio from './lib/util/stdio.js';

// initialize commander instance
const program = new Command();

// add metadata
program.name("lsh");
program.description("a cli for everyone");
program.version('1.0.0');

// add options
program.option('-d, --debug', 'run command in debug mode');
program.option('-v, --verbose', 'run command in verbose mode');
program.option('-i, --interactive', 'run command in interactive mode');

// add commands
program.addHelpCommand('help [command]', 'describe lsh and its options');
program.configureHelp({
  sortSubcommands: true,
  sortOptions: true,
  subcommandTerm: (cmd) => cmd.name() + " " + cmd.usage()
});



// add custom event listeners
program.on('option:verbose', function() {
  stdio.print(program.opts());
  process.env.VERBOSE = program.opts().verbose;
});

// add commands 
program
  .command('rm <name>')
  .description('remove bookmark from raindrop')
  .action((name: string) => {
    stdio.print('rd rm command called');
  });

program
  .command('ls')
  .description('list all bookmarks from raindrop')
  .action(() => {
    stdio.print('ls command called');
  });

program
  .command('get <name>')
  .description('get specific book from raindrop')
  .action((name: string, url: string) => {
    stdio.print('rd get command called');
  });

program
  .command('set <name> <url>')
  .description('get specific book from raindrop')
  .action((name: string, url: string) => {
    stdio.print('rd get command called');
  });

program
  .command('update <name> <url>')
  .description('update bookmark in raindrop')
  .action((name: string, url: string) => {
    stdio.print('rd update command called');
  });

program
  .command('find <name>')
  .description('search bookmark in raindrop')
  .action((name: string, url: string) => {
    stdio.print('rd search command called');
  });
// stdio.repl();
// program.help();

// begin processing input 
program.parse();
console.log('Options: ', program.opts());
console.log('Remaining arguments: ', program.args);

// exit cli
process.exit();
