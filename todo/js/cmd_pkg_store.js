/**
 * Current state of Pkg.Store type can be found here:
 *  https://c3energy.atlassian.net/wiki/spaces/ENG/pages/8203699495/VSCE+Pkg.store
 * PackageStore runbook:
 *  https://c3energy.atlassian.net/wiki/spaces/ENG/pages/8291224718/Pkg+and+Pkg.Store+Runbook
 * */
function set_package_store_true() {
  var packageName = 'armadaProd'
  var semanticVersion = '<stable version from the above table>'
  var appName = 'dev' // This can be whatever you desire
  Pkg.Store.configureDevStore()
  Pkg.Store.configureNestedFromArtifactHub(packageName, semanticVersion)
  Pkg.Store.inst().copyPkgToWritable(packageName)
}

// override old app version in package Store
function override_pkg_store_pkg() {
  Pkg.Store.copyPkgsToWritableFromArtifactHub({ '<packageName>': '<semanticVersion>' });
  var packageName = '<packageName>'
  var semanticVersion = '<newPkgVersion>'
  Pkg.Store.configureDevStore() // Clear previous package store entries
  Pkg.Store.configureNestedFromArtifactHub(packageName, semanticVersion)
  Pkg.Store.inst().copyPkgToWritable(packageName);

  Server.restart()
}

function disable_artifact_hub() {
// **In ENV's C3 App**
Microservice.Config.forName("ArtifactHub").setConfigValue(“appId”, null);
Pkg.Store.clearCaches();
}

function debug_pkg_store() {
// TODO:
// https://c3energy.atlassian.net/wiki/spaces/ENG/pages/8291224718/Pkg+and+Pkg.Store+Runbook

}

function deleteCaches() {
  // get default package
  var pkg = Pkg.Store.inst()
  // clear caches
  pkg.clearCaches();
  //clear root package
  // using root package name
  pkg.deleteContent(Pkg.Store.pkgDeclPath("guruSearch"));
}

// Pkg and Pkg.Store API Key
// kill vscode 
// delete uicli 
// sh clean_v8_directories
//
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
pkg.deleteContent(Pkg.Store.pkgDeclPath("c3ui_core"), true);

// delete any previously synced packages

// /var/folders/df/8qm0hv8j50dc1g6gpnxj7nc80000gn/T/http-basic/
//
Pkg.Store.clearCaches()

Pkg.File.Db.removeAll({}, true)  // this means you need to re-sync, use only for clean start.

Server.restart()

// get files for Pkg 
//
global IMPORTED_FILES_CACHE
if len(IMPORTED_FILES_CACHE) == 0:
  logger.info("IMPORTED_FILES_CACHE is empty")
if IMPORTED_FILES_CACHE.get(metadataPath, None) is not None:
logger.debug(f"cache hit for {metadataPath}")
file_globals = IMPORTED_FILES_CACHE[metadataPath]
    else:
GENAI_PYUTIL_IMPORT_ROOT = os.environ.get("GENAI_PYUTIL_IMPORT_ROOT", None)
file_contents = None
if GENAI_PYUTIL_IMPORT_ROOT:
  local_cache_path = os.path.join(GENAI_PYUTIL_IMPORT_ROOT, metadataPath.strip("/"))
if os.path.exists(local_cache_path):
  with open(local_cache_path, "r") as f:
  file_contents = f.read()

if file_contents is None:
metadata_file = c3.Pkg.file(metadataPath)
if not metadata_file or not metadata_file.exists():
                raise ValueError(f"Specified metadata path {metadataPath} does not exist")
file_contents = metadata_file.readString()

if GENAI_PYUTIL_IMPORT_ROOT:
  local_cache_path = os.path.join(GENAI_PYUTIL_IMPORT_ROOT, metadataPath.strip("/"))
os.makedirs(os.path.dirname(local_cache_path), exist_ok = True)
with open(local_cache_path, "w") as f:
f.write(file_contents)

compiled = compile(file_contents, "/c3" + metadataPath, 'exec')

// edit packages as a batch
var store = Pkg.Store.inst();
var pkgs = store.updatablePkgNames();
pkgs.forEach(pkg => {
  store.pkg(pkg).clearCaches();
  store.pkg(pkg).setDevMode(true);
});