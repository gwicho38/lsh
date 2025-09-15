/**
 * Shell Script Runner
 * Executes shell scripts with LSH
 */
export interface ScriptExecutionOptions {
    cwd?: string;
    env?: Record<string, string>;
    args?: string[];
    interactive?: boolean;
    verbose?: boolean;
}
export declare class ScriptRunner {
    private executor;
    constructor(options?: ScriptExecutionOptions);
    /**
     * Execute a shell script file
     */
    executeScript(scriptPath: string, options?: ScriptExecutionOptions): Promise<{
        success: boolean;
        exitCode: number;
        output: string;
        errors: string;
    }>;
    /**
     * Execute shell commands from string
     */
    executeCommands(commands: string, options?: ScriptExecutionOptions): Promise<{
        success: boolean;
        exitCode: number;
        output: string;
        errors: string;
    }>;
    /**
     * Execute script with shebang detection
     */
    executeWithShebang(scriptPath: string, options?: ScriptExecutionOptions): Promise<{
        success: boolean;
        exitCode: number;
        output: string;
        errors: string;
    }>;
    /**
     * Execute system script (fallback)
     */
    private executeSystemScript;
    /**
     * Validate shell script syntax
     */
    validateScript(scriptPath: string): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Get script information
     */
    getScriptInfo(scriptPath: string): {
        exists: boolean;
        executable: boolean;
        size: number;
        shebang?: string;
        interpreter?: string;
    };
    /**
     * Make script executable
     */
    makeExecutable(scriptPath: string): boolean;
    /**
     * Create a simple shell script
     */
    createScript(scriptPath: string, content: string, makeExecutable?: boolean): boolean;
}
export default ScriptRunner;
