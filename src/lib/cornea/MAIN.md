# MAIN | CORNEA INGEST PIPELINE

## Part 1: Init Env and FileSystem

```javascript

// set hardware profile on SNE and Jupyter
// from c3/c3
var cpus = 8;
var memory = 64000;
var jvmRatio = 0.5;
C3.app().nodePool("singlenode").setHardwareProfile(cpus, memory, 0).setJvmSpec(jvmRatio).update();

// wait for c3server restart
// Start by default with the GPU profile 
JupyterHub.config().setConfigValue('jupyterCustomC3Defaultprofile', 'large') 
// Increase timeout to 24 hours
JupyterHub.config().setConfigValue('jupyterSingleUserCullTimeout', 24*60*60)
// Increase disk size to hold large models (if needed)
JupyterHub.config().setConfigValue('jupyterSingleUserStorageCapacity', '512Gi')
JupyterHub.ensureService()

// also run these commands to avoid weird issues interacting with certain Genai Types
EnableAclPrivilege.removeAll(null, true);  // to avoid potential ACL errors
User.myUser().addToGroup("Genai.AdminUser") // if you don't have this UserGroup already in addition to AppAdmin

// create FSC for Genai
var customerName = "cornea";  
var projectRootDir = [FileSystem.parseRootUrl().scheme, "://", FileSystem.parseRootUrl().host, "/", customerName, "/"].join("");
console.log("All my files will be going in: " + projectRootDir);

// set mount
FileSystem.setMount(customerName + "-mount", projectRootDir);
FileSystem.setMount("vector-store", projectRootDir + "vector-store/");

// create source collection if it doesn't exist
if (!Genai.SourceCollection.forId(customerName)) {

}
var sourceCollection = Genai.SourceCollection.make({
    "name": customerName,
    "id": customerName,
    "description": "Collection of files for " + customerName,
    "rootUrl": projectRootDir + "unstructured/docs/",
    "targetUrl": projectRootDir + "unstructured/passageFiles/"
}).upsert().get()

// create Retriever vector-store if doesn't exist
if (!Genai.Retriever.ColBERT.forId(customerName)) {
  var vs = Genai.Retriever.ColBERT.make({
    "id": customerName,
    "name": customerName,
    "dataConfigName": customerName
  }).upsert();
}

```

## Part 2: Upload Source Files

```bash



```
