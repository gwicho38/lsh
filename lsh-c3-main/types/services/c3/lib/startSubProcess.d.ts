import { Sender } from "xstate/lib/types";
import { SubProcessEvent, SubProcessOptions } from "../main/subProcess";
import SubProcessMachineContext, { SUBPROCESS } from "./SubProcessMachineContext";
import { SubProcessMachineEvent } from "./events";
export type StringBoolean = "false" | "true";
export type SubProcessStarterOptions<T extends string[]> = {
    /**
     * The file name of the script that will be loaded from the subProcesses folder
     */
    main: SUBPROCESS;
    /**
     * The arguments to pass to the main script
     */
    args: T;
    /**
     * Sub process options
     */
    options?: Partial<SubProcessOptions>;
};
export declare const subProcessMain: (subProcessName: string, rootDir: string) => string;
export type EventHandlers = {
    on: Record<string, (event: SubProcessEvent) => void | (() => void)>;
};
/**
 * Starts a sub process
 *
 * @param context the sub process state machine context
 * @param callback machine event sender
 * @param starterOptions the options to start the sub process
 * @param eventHandlers optional event handlers
 */
export declare function startSubProcess<T extends string[]>(context: SubProcessMachineContext, callback: Sender<SubProcessMachineEvent>, starterOptions: SubProcessStarterOptions<T>, eventHandlers?: EventHandlers): void;
