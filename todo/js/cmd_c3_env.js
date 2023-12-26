// Setup Env for Offline Repo 

https://github.com/c3-e/c3server/blob/af7241f8efa546968d59c72163b9baf7f952a61d/platform/platform/src/main/c3/platform/src/doc/air-gapped-application-development-setup.c3doc.md

Js.Runtime.forName('js-ide-vscode-client-node')

NpmLibraryManager.inst().mergedRuntime('js-webpack_c3')
npm.ensureRuntimeInstalled('js-webpack_c3');

var npm = NpmLibraryManager.inst()
npm.runtimesBasePath()
var npm = NpmLibraryManager.inst()
npm.installRuntime('js-webpack_c3')

var domainName = "localhost";
var appUrl = AppUrl.builder().id(domainName).env(C3.env().name).app(C3.app().name).build();
appUrl.upsert();

Cluster.startEnv({
  "name": "dev", // your initials
  "singleNode": true,    // use false so that you can have task nodes. 
});

// Setup App
var spec = Env.StartAppSpec.make({
  "name": "gurusearchui",
  "singleNode": true,
  "rootPkg": "gurusearchui"
});

// Start App
Env.forName("dev").startApp(spec)

// Delete App
Env.forName('mab').terminateApp(App.forName('dftest'),true)

//Resume Env
Cluster.resumeEnv(Env.forName("<envname>"))

// Delete Env
Cluster.inst().terminateEnv(Env.forName(“<env_name>”), true)


Pkg.setDevMode(True)`



