import { exec } from 'child_process';
import { spawn } from 'child_process';
import { GitHubClient } from './githubClient';

// TODO: sanitize inputs
export async function shell_exec(command: string) {
    const gitHubClient = new GitHubClient();
    // Example: if (command.includes('github')) {
    //     // Use gitHubClient methods here
    // }
    // console.log(command);
    // return;
    exec(command, (error, stdout, stderr) => {
    if (error) {
        console.error(`exec error: ${error}`);
        return;
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
    });
}

// TODO: sanitize inputs
export async function shell_spawn(command: string) {
    const gitHubClient = new GitHubClient();
    // Example: if (command.includes('github')) {
    //     // Use gitHubClient methods here
    // }

    const ls = spawn('ls', ['-lh']);
    
    ls.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });
    
    ls.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });
    
    ls.on('close', (code) => {
      console.log(`child process exited with code ${code}`);
    });
    
}