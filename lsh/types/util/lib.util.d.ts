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
export declare function getFiles(path: string): Promise<string[]>;
export declare function loadCommands(baseCmd: string, path: string): Promise<{}>;
export declare const getAllTsFiles: (dir: any, ig: any, fileList?: any[]) => any[];
export declare const searchTsFiles: (searchQuery: any) => import("fuse.js").FuseResult<any>[];
