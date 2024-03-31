export declare const getPkgId: () => string;
export declare const setPkgId: (value: string) => void;
export declare const getPrivateKey: () => string;
export declare const setPrivateKey: (value: string) => void;
export declare const getkey: () => string;
export declare const setkey: (value: string) => void;
export declare const getKey: () => void;
export declare const setKey: (value: any) => void;
export declare const get: () => void;
export declare const set: (value: any) => void;
export declare const inst: (value: any) => void;
export declare const kill: (value: any) => void;
type LSH= {
    id?: number;
    name?: string;
    key?: string;
    pkgId?: string;
    get?: any;
    set?: any;
};
export declare const lsh: LSH;
export { };

