import { Command } from "commander";
export declare function init_c3(program: Command): Promise<Command>;
export declare function bootC3(): Promise<any>;
export declare function startDevEnv(): Promise<any>;
export declare function startDevApp(): Promise<any>;
export declare function assignAppUrl(): Promise<void>;
export declare function installImplLanguages(): Promise<any>;
export declare function installRuntimes(): Promise<any>;
export declare function resetServer(): Promise<any>;
