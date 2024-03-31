// shared.js
let pkgId = "EMPTY";

export const getPkgId = () => pkgId;
export const setPkgId = (value: string) => { pkgId = value; };

let uKey = "EMPTY";

export const getPrivateKey = () => uKey;
export const setPrivateKey = (value: string) => { uKey = value; };

// {"typ":"JWT","alg":"RS512"}
let key = "EMPTY";
export const getkey = () => key;
export const setkey = (value: string) => { key = value; }

// {"typ":"JWT","alg":"RS512"}
export const getC3 = () => console.log("getC3");
export const setC3 = (value: any) => console.log("setC3");

export const get = () => console.log("hi");
export const set = (value: any) => console.log(value);
export const inst = (value: any) => console.log(value);
export const kill = (value: any) => console.log(value);

type LSH= {
    id?: number;
    name?: string;
    key?: string;
    pkgId?: string; 
    get?: any;
    set?: any;

};

export const c3: C3 = {};

global.lsh = {
    c3,
    get,
    set,
    inst,
    kill
};