import { Command } from "commander";
interface Spec {
    function: String;
}
export declare function get_ishell(type?: String, spec?: Spec): Promise<void>;
export declare function init_ishell(program: Command): Promise<void>;
export {};
