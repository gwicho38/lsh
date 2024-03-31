import { Command } from 'commander';
interface Spec {
    data?: [any];
}
export declare function init_c3_cmd(program: Command): Promise<void>;
export declare function c3_auth(): any;
export declare function test_c3(): Promise<void>;
export declare function inst_c3(): Promise<void>;
export declare function c3_post(typeName?: String, method?: String, dataSpec?: Spec): Promise<void>;
export declare function c3_get_type_system(): Promise<void>;
export {};
