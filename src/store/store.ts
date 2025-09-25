// shared.js
let pkgId = "EMPTY";

export const getPkgId = () => pkgId;
export const setPkgId = (value: string) => { pkgId = value; };

let uKey = "EMPTY";

export const getPrivateKey = () => uKey;
export const setPrivateKey = (value: string) => { uKey = value; };

// {"typ":"JWT","alg":"RS512"}
let key = "EMPTY";
export const getKey = () => key;
export const setKey = (value: string) => { key = value; }

// {"typ":"JWT","alg":"RS512"}
export const getShell = () => console.log("getLSH");
export const setShell = (_value: unknown) => console.log("setLSH");

const cmdMap = new Map();
export const setCmdMap = (key: string, value: unknown) => {
    cmdMap.set(key, value);
    console.log(cmdMap.size);
};
export const getCmdMap = () => cmdMap;

export const get = (_key: unknown) => lsh.key;
export const set = (_key: unknown, value: unknown) => lsh.key = value;
export const inst = (value: unknown) => console.log(value);
export const kill = (value: unknown) => console.log(value);

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

export const lsh: LSH = {};

// Extend global interface to include lsh
declare global {
    var lsh: {
        get: (key: unknown) => unknown;
        set: (key: unknown, value: unknown) => unknown;
        inst: (value: unknown) => void;
        kill: (value: unknown) => void;
    };
}

(globalThis as typeof globalThis & { lsh: typeof globalThis.lsh }).lsh = {
    get,
    set,
    inst,
    kill
};