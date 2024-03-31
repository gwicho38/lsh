import { Sender } from "xstate/lib/types";
import { EventHandlers, StringBoolean } from "./startSubProcess";
import SubProcessMachineContext from "./SubProcessMachineContext";
import { SubProcessMachineEvent } from "./events";
/**
 * Starts the repository watcher sub process.
 *
 * @param context state machine context
 * @param callback event sender used to handle events sent from the child.
 * @param events optional event handlers
 */
export declare function startRepositoryWatcher(context: SubProcessMachineContext, callback: Sender<SubProcessMachineEvent>, events: EventHandlers): Promise<void>;
export type RepositoryWatcherArgs = [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    StringBoolean,
    string,
    string,
    string,
    string,
    ...string[]
];
