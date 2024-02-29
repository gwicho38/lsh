import { exec } from 'child_process';
import { spawn } from 'child_process';

// TODO: sanitize inputs
export async function shell_exec(command: string) {
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