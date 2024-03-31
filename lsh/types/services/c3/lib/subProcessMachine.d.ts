/// <reference types="node" />
import SubProcessMachineContext, { SubProcessMachineEvent, ProcessMemory } from "./SubProcessMachineContext";
import { ListenerOptions } from "./options";
export declare const trackMaxMemory: (memoryState: ProcessMemory) => NodeJS.Timeout;
/**
 * Creates a machine to manage sub processes
 *
 * @param context The initial context of the machine
 * @param listeners TODO
 * @returns the state machine
 */
export declare const createSubProcessesMachine: (context: SubProcessMachineContext, listeners?: ListenerOptions) => StateMachine<SubProcessMachineContext, any, SubProcessMachineEvent>;
