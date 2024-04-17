// Pkg CRUD
// source: https://c3energy.atlassian.net/wiki/spaces/GENAI/pages/8306527724/Useful+JS+Console+and+Jupyter+Snippets

// pkg.deleteContent(Pkg.Store.pkgDeclPath("guruSearch"));

// Pkg.setDevMode(true);

// Pkg.Store.inst().doValidatePkg(pkgName)

// Pkg.Store.inst().replaceCachedPkg("guruSearchUI")

// var deps = ["main", "c3ui_core", "test", "guruSearchUI", "uiComponentLibraryReact", "uiInfrastructure", "uiInfrastructureReact", "cssLibrary"];

// var pkg = Pkg.Store.inst();
// deps.forEach(d => {
//   pkg.deleteContent(Pkg.Store.pkgDeclPath(d), true);
// })

// // delete the ui core package
// // get default package
// // var pkg = Pkg.Store.inst()
// // clear caches
// pkg.clearCaches();
// //clear root package
// // using root package name
// // pkg.deleteContent(Pkg.Store.pkgDeclPath("c3ui_core"), true);

// // delete any previously synced packages

// // /var/folders/df/8qm0hv8j50dc1g6gpnxj7nc80000gn/T/http-basic/
// //
// Pkg.Store.clearCaches()

// Pkg.File.Db.removeAll({}, true)  // this means you need to re-sync, use only for clean start.

// Server.restart()


// // edit packages as a batch
// var store = Pkg.Store.inst();
// var pkgs = store.updatablePkgNames();
// pkgs.forEach(pkg => {
//   store.pkg(pkg).clearCaches();
//   store.pkg(pkg).setDevMode(true);
// });

// // set all packages in dev mode
// const dependencies = [
//   "cssLibrary",
//   "uiBundler",
//   "uiInfrastructure",
//   "userManagementCopy",
//   "genAiBase",
//   "uiComponentLibrary",
//   "uiInfrastructureReact",
//   "genAiSearch",
//   "uiComponentLibraryReact",
//   "uiSdlReact"
// ];

// dependencies.forEach(pkg => {
//   // Start the app
//   var app = C3.env().startApp({
//     "name": pkg.toLocaleLowerCase(),
//     "rootPkg": pkg.toLocaleLowerCase(),
//     "mode": "DEV"
//   });
// })


// 2023 - 12 - 19

// var store = Pkg.store.inst();
// var pkgs = store.pkgs();

// pkgs.forEach(pkg => {
//   // Start the app
//   var app = C3.env().startApp({
//     "name": pkg.toLocaleLowerCase(),
//     "rootPkg": pkg.toLocaleLowerCase(),
//     "mode": "DEV"
//   });
// })
