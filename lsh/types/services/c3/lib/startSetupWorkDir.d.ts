import { Sender } from "xstate/dist/declarations/src/types";
import { StringBoolean } from "./startSubProcess";
import SubProcessMachineContext from "./SubProcessMachineContext";
import { SubProcessMachineEvent } from "./events";
/**
 *
 * @param context state machine context
 * @param callback event sender
 */
export declare function startSetupWorkDir(context: SubProcessMachineContext, callback: Sender<SubProcessMachineEvent>): void;
export type SetupWorkDirArgs = [
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
    string
];
