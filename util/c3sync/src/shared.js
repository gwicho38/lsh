// shared.js
let pkgId = "EMPTY";

export const getPkgId = () => pkgId;
export const setPkgId = (value) => { pkgId = value; };

let uKey = "EMPTY";

export const getPrivateKey = () => uKey;
export const setPrivateKey = (value) => { uKey = value; };

// {"typ":"JWT","alg":"RS512"}
let c3Key = "EMPTY";
export const getC3Key = () => c3Key;
export const setC3Key = (value) => { c3Key = value; }