import { Command } from 'commander';
import stdio from './lib/util/stdio.js';
// import raindrop from './lib/raindrop/raindrop';

// initialize commander instance
const program = new Command();

// add metadata
program.version('1.0.0');

// add options
program
  .option('-d, --debug', 'run command in debug mode')
  .option('-v, --verbose', 'run command in verbose mode')
  .option('-i, --interactive', 'run command in interactive mode');

stdio.repl();
