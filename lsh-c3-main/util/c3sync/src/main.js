import { program } from 'commander';
import readline from 'readline';

// local dependencies
import { c3Post, createGlobalAuthToken } from './api.js'; // Adjust the path as necessary
import { getC3Key, setC3Key } from './shared.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

program
  .name('Node Shell')
  .description('CLI to interact with c3Post API')
  .version('1.0.0');

program.command('shell')
  .description('Start the interactive shell')
  .action(() => {
    console.log('Interactive shell started. Type "exit" to quit.');
    interactiveShell();
  });

program.command('sync')
.description('Sync files listed in config directory')
.action(() => {
  console.log('Syncing all files');
  interactiveShell();
});

program.command('auth')
.description('Authenticate to C3 server with persistent auth token')
.action(() => {
  console.log('Syncing all files');
  console.log(getC3Key() != "EMPTY" ? getC3Key() : getC3Key(setC3Key(createGlobalAuthToken())));
  createGlobalAuthToken();
});

async function interactiveShell() {
  while (true) {
    const typeName = await askQuestion('Enter typeName (or type exit to quit): ');
    if (typeName === 'exit') break;

    const method = await askQuestion('Enter method: ');
    if (method === 'exit') break;

    const data = {}; // Assuming a fixed or empty data object for simplicity, modify as needed

    try {
      const response = await c3Post(typeName, method, data);
      console.log('Response:', response.data); // Adjust according to your API response structure
    } catch (error) {
      console.error('Error:', error);
    }
  }

  rl.close();
}

program.parse(process.argv);
