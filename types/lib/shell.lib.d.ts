export declare function shell_exec(command: string): Promise<{
    stdout: string;
    stderr: string;
    error?: string;
}>;
export declare function shell_spawn(command: string, args?: string[]): Promise<{
    stdout: string;
    stderr: string;
    code: number;
}>;
