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
export const setShell = (value: any) => console.log("setLSH");

let cmdMap = new Map();
export const setCmdMap = (key: string, value: any) => {
    cmdMap.set(key, value);
    console.log(cmdMap.size);
};
export const getCmdMap = () => cmdMap;

export const get = (key: any) => lsh.key;
export const set = (key: any, value: any) => lsh.key = value;
export const inst = (value: any) => console.log(value);
export const kill = (value: any) => console.log(value);

type LSH = {
    key?: any;
    id?: number;
    name?: string;
    session?: string;
    pkgId?: string; 
    get?: any;
    set?: any;
    commands?: any;
};

export const lsh: LSH = {};

global.lsh = {
    get,
    set,
    inst,
    kill
};