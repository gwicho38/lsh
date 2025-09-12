import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Execute shell command and return result
export async function shell_exec(command: string): Promise<{stdout: string, stderr: string, error?: string}> {
    try {
        const { stdout, stderr } = await execAsync(command);
        return { stdout: stdout.trim(), stderr: stderr.trim() };
    } catch (error) {
        return { 
            stdout: '', 
            stderr: '', 
            error: error.message 
        };
    }
}

// Execute shell command with streaming output
export function shell_spawn(command: string, args: string[] = []): Promise<{stdout: string, stderr: string, code: number}> {
    return new Promise((resolve) => {
        const [cmd, ...defaultArgs] = command.split(' ');
        const finalArgs = args.length > 0 ? args : defaultArgs;
        
        const child = spawn(cmd, finalArgs);
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        child.on('close', (code) => {
            resolve({ 
                stdout: stdout.trim(), 
                stderr: stderr.trim(), 
                code: code || 0 
            });
        });
    });
}