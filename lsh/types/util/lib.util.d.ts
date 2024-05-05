/**
 * @example
 *
 * Example usage: Load commands from a specified directory asynchronously
 * loadCommands('./path/to/directory').then(commandDict => {
 *   console.log(commandDict);
 * }).catch(error => {
 *   console.error('Failed to load commands:', error);
 * });
 * Example usage: Load commands from a specified directory
 * const commandDict = loadCommands('./path/to/directory');
 * console.log(commandDict);
 *
 * @param directory
 * @returns @type CommandDictionary
 */
export interface CommandDictionary {
    [filename: string]: Function[];
}
export declare function getFiles(): Promise<string[]>;
