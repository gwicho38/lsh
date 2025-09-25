export declare const getPkgId: () => string;
export declare const setPkgId: (value: string) => void;
export declare const getPrivateKey: () => string;
export declare const setPrivateKey: (value: string) => void;
export declare const getKey: () => string;
export declare const setKey: (value: string) => void;
export declare const getShell: () => void;
export declare const setShell: (_value: unknown) => void;
export declare const setCmdMap: (key: string, value: unknown) => void;
export declare const getCmdMap: () => Map<any, any>;
export declare const get: (_key: unknown) => unknown;
export declare const set: (_key: unknown, value: unknown) => unknown;
export declare const inst: (value: unknown) => void;
export declare const kill: (value: unknown) => void;
type LSH = {
    key?: unknown;
    id?: number;
    name?: string;
    session?: string;
    pkgId?: string;
    get?: unknown;
    set?: unknown;
    commands?: unknown;
};
export declare const lsh: LSH;
declare global {
    var lsh: {
        get: (key: unknown) => unknown;
        set: (key: unknown, value: unknown) => unknown;
        inst: (value: unknown) => void;
        kill: (value: unknown) => void;
    };
}
export {};
