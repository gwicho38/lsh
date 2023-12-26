// get default package
var pkg = Pkg.Store.inst()
// clear caches
pkg.clearCaches();
//clear root package
// using root package name
pkg.deleteContent(Pkg.Store.pkgDeclPath("guruSearch"));

Pkg.setDevMode(true);

Pkg.Store.inst().doValidatePkg(pkgName)

Pkg.Store.inst().replaceCachedPkg("guruSearchUI")

// delete all dependency packages
// "main": "⣿⣀⣀⣀⣀⣀⣀⣀⣀⣀ 10%",
//   "c3ui_core": "⣿⣄⣀⣀⣀⣀⣀⣀⣀⣀ 14%",
//     "test": "⣿⣿⣿⣿⣤⣀⣀⣀⣀⣀ 47%",
//       "guruSearchUI": "⣿⣿⣿⣿⣿⣿⣦⣀⣀⣀ 69%",
//         "uiComponentLibraryReact": "⣿⣤⣀⣀⣀⣀⣀⣀⣀⣀ 15%",
//           "uiComponentLibrary_1": "⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿ 100%",
//             "guruSearchUI_1": "⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿ 100%",
//               "govSecurityV8_1": "⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿ 100%",
//                 "uiComponentLibraryReact_1": "⣿⣿⣿⣤⣀⣀⣀⣀⣀⣀ 37%",
//                   "uiInfrastructure_1": "⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿ 100%",
//                     "uiComponentLibrary": "⣿⣿⣿⣀⣀⣀⣀⣀⣀⣀ 32%",
//                       "uiInfrastructure": "⣿⣿⣿⣿⣤⣀⣀⣀⣀⣀ 45%",
//                         "uiInfrastructureReact": "⣿⣿⣿⣦⣀⣀⣀⣀⣀⣀ 37%",
//                           "uiInfrastructureReact_1": "⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿ 100%",
//                             "cssLibrary": "⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿ 100%",
//                               "govSecurityV8": "⣿⣿⣀⣀⣀⣀⣀⣀⣀⣀ 21%",
//                                 "__DRAFT__": "⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿ 100%"

var deps = ["main", "c3ui_core", "test", "guruSearchUI", "uiComponentLibraryReact", "uiInfrastructure", "uiInfrastructureReact", "cssLibrary"];

var pkg = Pkg.Store.inst();
deps.forEach(d => {
  pkg.deleteContent(Pkg.Store.pkgDeclPath(d), true);
})

// delete the ui core package
// get default package
var pkg = Pkg.Store.inst()
// clear caches
pkg.clearCaches();
//clear root package
// using root package name
// pkg.deleteContent(Pkg.Store.pkgDeclPath("c3ui_core"), true);

// delete any previously synced packages

// /var/folders/df/8qm0hv8j50dc1g6gpnxj7nc80000gn/T/http-basic/
//
Pkg.Store.clearCaches()

Pkg.File.Db.removeAll({}, true)  // this means you need to re-sync, use only for clean start.

Server.restart()


// edit packages as a batch
var store = Pkg.Store.inst();
var pkgs = store.updatablePkgNames();
pkgs.forEach(pkg => {
  store.pkg(pkg).clearCaches();
  store.pkg(pkg).setDevMode(true);
});

// set all packages in dev mode
const dependencies = [
  "cssLibrary",
  "uiBundler",
  "uiInfrastructure",
  "userManagementCopy",
  "genAiBase",
  "uiComponentLibrary",
  "uiInfrastructureReact",
  "genAiSearch",
  "uiComponentLibraryReact",
  "uiSdlReact"
];

dependencies.forEach(pkg => {
  // Start the app
  var app = C3.env().startApp({
    "name": pkg.toLocaleLowerCase(),
    "rootPkg": pkg.toLocaleLowerCase(),
    "mode": "DEV"
  });
})


2023 - 12 - 19

var store = Pkg.store.inst();
var pkgs = store.pkgs();

pkgs.forEach(pkg => {
  // Start the app
  var app = C3.env().startApp({
    "name": pkg.toLocaleLowerCase(),
    "rootPkg": pkg.toLocaleLowerCase(),
    "mode": "DEV"
  });
})
