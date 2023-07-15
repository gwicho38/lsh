import { Command } from 'commander';
// import raindrop from './lib/raindrop/raindrop';

const program = new Command();

program.version('1.0.0');

program
  .command('create <title>')
  .description('Create a new raindrop')
  .action(() => console.log("Test"));

program.parse(process.argv);
