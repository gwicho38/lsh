// shared.js
let pkgId = "EMPTY";

// TODO(@gwicho38): Review - getPkgId

// TODO(@gwicho38): Review - getPkgId
export const getPkgId = () => pkgId;
// TODO(@gwicho38): Review - setPkgId
export const setPkgId = (value: string) => { pkgId = value; };

let uKey = "EMPTY";

// TODO(@gwicho38): Review - getPrivateKey

// TODO(@gwicho38): Review - getPrivateKey
export const getPrivateKey = () => uKey;
// TODO(@gwicho38): Review - setPrivateKey
export const setPrivateKey = (value: string) => { uKey = value; };

// {"typ":"JWT","alg":"RS512"}
let key = "EMPTY";
// TODO(@gwicho38): Review - getKey
export const getKey = () => key;
// TODO(@gwicho38): Review - setKey
export const setKey = (value: string) => { key = value; }

// {"typ":"JWT","alg":"RS512"}
// TODO(@gwicho38): Review - getShell
export const getShell = () => console.log("getLSH");
// TODO(@gwicho38): Review - setShell
export const setShell = (_value: unknown) => console.log("setLSH");

const cmdMap = new Map();
// TODO(@gwicho38): Review - setCmdMap
export const setCmdMap = (key: string, value: unknown) => {
    cmdMap.set(key, value);
    console.log(cmdMap.size);
};
// TODO(@gwicho38): Review - getCmdMap
export const getCmdMap = () => cmdMap;

// TODO(@gwicho38): Review - get

// TODO(@gwicho38): Review - get
export const get = (_key: unknown) => lsh.key;
// TODO(@gwicho38): Review - set
export const set = (_key: unknown, value: unknown) => lsh.key = value;
// TODO(@gwicho38): Review - inst
export const inst = (value: unknown) => console.log(value);
// TODO(@gwicho38): Review - kill
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