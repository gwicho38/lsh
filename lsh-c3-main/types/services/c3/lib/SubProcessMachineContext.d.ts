import { SubProcessMachineOptions } from "./options";
import { SubProcessMachineEvent, StateFinishedEvent, FailEvent, LogEvent, BundleFinishedEvent } from "./events";
import BundlerMeasurments from "./BundlerMeasurements";
import SUBPROCESS from "./SUBPROCESS";
import Logger from "./Logger";
interface InternalState {
    /**
     * A logs buffer
     */
    logs: {
        [key in SUBPROCESS]: LogEvent[];
    };
    logsBufferSize: number;
    logger: Logger;
    maxMemory?: number;
    fatalError?: string[];
    subProcessSetupTime?: number;
    npmInstallTime?: number;
    isIncrementalFileUpdate?: boolean;
    fileName?: string;
    loaderType?: string;
    bundlerMeasurements?: BundlerMeasurments;
}
interface Hooks {
    /**
     * Called when the machine is done running
     */
    onDone?: (context: SubProcessMachineContext) => void;
    onError?: (context: SubProcessMachineContext) => void;
}
interface ProcessMemory {
    maxMemory: number;
}
type SubProcessMachineContext = SubProcessMachineOptions & InternalState & Hooks;
export { SUBPROCESS, InternalState, Hooks, LogEvent, FailEvent, BundleFinishedEvent, SubProcessMachineEvent, StateFinishedEvent, ProcessMemory, };
export default SubProcessMachineContext;
