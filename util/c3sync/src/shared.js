// shared.js
let pkgId = "EMPTY";

module.exports = {
  getPkgId: () => pkgId,
  setPkgId: (value) => { pkgId = value; },
};

