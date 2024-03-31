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
export const getLSH = () => console.log("getLSH");
export const setLSH = (value: any) => console.log("setLSH");

export const get = () => console.log("hi");
export const set = (value: any) => console.log(value);
export const inst = (value: any) => console.log(value);
export const kill = (value: any) => console.log(value);

type LSH = {
    id?: number;
    name?: string;
    key?: string;
    session?: string;
    pkgId?: string; 
    get?: any;
    set?: any;

};

export const lsh: LSH = {};

global.lsh = {
    get,
    set,
    inst,
    kill
};