import readline from 'readline';
import { c3Post } from './api.js'; // Adjust the path to where your c3Post function is defined

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  while (true) {
    const typeName = await askQuestion('Enter typeName (or type exit to quit): ');
    if (typeName === 'exit') break;

    const method = await askQuestion('Enter method: ');
    if (method === 'exit') break;

    // Assuming a fixed or empty data object for simplicity
    const data = {}; // Modify or extend this as needed based on your API's requirements

    try {
      const response = await c3Post(typeName, method, data);
      console.log('Response:', response.data); // Adjust this according to the actual structure of your API response
    } catch (error) {
      console.error('Error:', error);
    }
  }

  rl.close();
}

main();
