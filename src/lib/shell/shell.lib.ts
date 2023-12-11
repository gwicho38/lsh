import { exec } from 'child_process';

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