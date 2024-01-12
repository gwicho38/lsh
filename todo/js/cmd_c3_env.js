// Setup Env for Offline Repo 

https://github.com/c3-e/c3server/blob/af7241f8efa546968d59c72163b9baf7f952a61d/platform/platform/src/main/c3/platform/src/doc/air-gapped-application-development-setup.c3doc.md

Js.Runtime.forName('js-ide-vscode-client-node');
Cluster.startEnv({
  "name": "dev", // your initials
  "singleNode": true,    // use false so that you can have task nodes. 
});
// change to dev env
Js.Runtime.forName('js-ide-vscode-client-node');
// nvm set node to runtime provided

var npm = NpmLibraryManager.inst().mergedRuntime('js-webpack_c3')
npm.ensureRuntimeInstalled('js-webpack_c3');

var npm = NpmLibraryManager.inst()
npm.runtimesBasePath()
var npm = NpmLibraryManager.inst()
npm.installRuntime('js-webpack_c3')



Cluster.startEnv({
  "name": "dev", // your initials
  "singleNode": true,    // use false so that you can have task nodes. 
});

// enable Pkg Store
// https://c3energy.atlassian.net/wiki/spaces/ENG/pages/8291224718/Pkg+and+Pkg.Store+Runbook
Pkg.Store.configureDevStore()

// Setup App
var spec = Env.StartAppSpec.make({
  "name": "gurusearch",
  "singleNode": true,
  "rootPkg": "gurusearch"
});

// Start App
Env.forName("dev").startApp(spec)

// Delete App
Env.forName('mab').terminateApp(App.forName('dftest'),true)

//Resume Env
Cluster.resumeEnv(Env.forName("<envname>"))

// Delete Env
Cluster.inst().terminateEnv(Env.forName(“<env_name>”), true)


Pkg.setDevMode(True)

var domainName = "localhost";
var appUrl = AppUrl.builder().id(domainName).env(C3.env().name).app(C3.app().name).build();
appUrl.upsert();

// clear vs code 
rm -rf extension/out/node_modules/
removeOrphanedProcesses

{"version":"1.0.0","name":"tmp","dependencies":{"@c3/remote":"file:../../../../../../../var/folders/df/8qm0hv8j50dc1g6gpnxj7nc80000gn/T/c3-remote/old_c3-remote.tgz","http-basic":"file:../../../../../../../var/folders/df/8qm0hv8j50dc1g6gpnxj7nc80000gn/T/http-basic/old_http-basic.tgz","sync-rpc":"file:../../../../../../../var/folders/df/8qm0hv8j50dc1g6gpnxj7nc80000gn/T/sync-rpc/old_sync-rpc.tgz"}

class C3x {
  /**
   * Helper function to get a named c3typ
   * @param name The type name
   * @param async Optional flag to retrieve type from async typesystem. Default is false
   * @returns Type.c3typ
   */
  static type(name, async = false) {
      const ts = async ? connect_1.Connection.inst().connection().asyncTypeSystem() : connect_1.Connection.inst().connection().typeSystem();
      if (ts) {
          return ts.type(name);
      }
      else {
          throw `C3 Type System not ready, failed to fetch ${name}.c3typ`;
      }
  }
  /**
   * @param typeName String of type name we are making the member function call on
   * @param functionName Function name of memeber function
   * @param obj Instance of type which we are making memeber function call
   * @param args Arguments the member function expects
   * @returns Promise
   */
  static async callAsync(typeName, functionName, obj, ...args) {
      return connect_1.Connection.inst()
          .connection()
          .typeSystem()
          .async()
          .call(typeName, functionName, obj, ...args);
  }
}