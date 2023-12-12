## Generating Local Bundles

```js

	UiSdlConfig.getConfig({}).setConfigValue("infrastructure.webpackMode", "production");  
UiBundlerConfig.inst().setConfigValue('bundleOnProvision', false);  
UiBundler.removeAll();  
UiBundlerResult.removeAll();       

UiBundlerPerformanceProfile.removeAll();  
UiSdlMetadataFileManifest.removeAll()

UiBundler.generateBundles();

```

## Collecting Offline Bundles

### Create Local Package

> c3 prov zip

[You can use c3 prov zip to collect local/remote bundles and package provision] (https://developer.c3.ai/docs/latest/guide/guide-c3aisuite-basic/cli-prov-zip)



```sh

c3 prov zip -c package1 --output /home/documents/output/package1.7.2.0.1.zip
c3 prov zip -c package1 --output /home/documents/output/
c3 prov zip -c package1
c3 prov zip -c package1 --zipDependencies

```

### Check MetaData Errors

Check if there’s any metadata errors that would prevent a successful bundle

> MetadataStore.tag().issues()

If bundling **locally** make sure concurrency is high.

> UiBundlerConfig.make().setConfigValue('maxConcurrencyPerNode', 4)

> [!WARNING] Warning
> High concurrency in prod environment can lead to breaking changes.

### Set Bundling to Production Mode

Make sure you are bundling in production mode if you want the UI to be as responsive as possible

```js
UiSdlConfig.getConfig({}).setConfigValue("infrastructure.webpackMode", "production")
```

### Clear out any existing bundles

> UiBundler.removeAll()

### Generate bundles

> UiBundler.generateBundles()

### Retrieve Bundles

Script to pull out bundles from C3 File System (via Jonathon Arbaugh)

```js

// Define `package` as your application package name

var package = 'eels';

var zipName = 'ui-bundles-updated-eels' + '2021-09-29T00.zip';

// Run the following 9 lines to create a file

	var contentRoot = 'content/c3';

var fs = FileSystem.fileSystemConfig();

var zipPath = fs[fs.default].mounts['DEFAULT'] + '/' + zipName;

var bundles = MetadataStore.tag()

  .files()

  .filter(function(f) {

    return f.encodedSubPath.startsWith(contentRoot) && f.contentLength > 0

  });

var zipFile = FileSystem.zipFiles(zipPath, bundles, contentRoot);

// This will return the URL for the zip file

// Click this URL and your download will begin

c3Context().hostUrl + '/' + zipFile.apiEndpoint();

```

### Arranging Offline Bundles

After gathering the correct offline bundles above, make sure they are stored in the correct folder structure

Your bundles folder will look similar to this, **ignore uiInfastruture and uiInfastructureReact**

![[Pasted image 20221229171108.png]]

Store the other folders/ui/content/c3 files into your application ui/content/c3 folder (You may have to make a /c3 folder)

Here I’m storing energyManagementDemo’s offline bundles into energyManagementDemo itself

BUG: If you have a uiFramework dependency (in addition to uiComponentLibrary) you need non-zero contents index.css for UIStylesheetTransformer to not complain and fail

Solution: Write an empty index.css file at <package>/ui/content/assets/stylesheets/index.css (create the appropriate directories as necessary) and fill it with .empty {}

UI-6865: [Core – Infrastructure] Ensure that Component Library (Webpack-based) Applications Work/Load Offline

🚀

CLOSED

Not Fixed in: 7.25 :disappointed:

## Bundler Configurations

### Production Bundler Config

```json

{
  "bundleOnProvision" : true,
  "onlyRootPackageTests" : true,
  "maxConcurrencyPerNode" : 2,
  "maxConcurrency" : -1,
  "persistentWorkDir" : false,
  "workDirCleanupTimeout" : 120,
  "outputDirTtl" : 7200,
  "keepUiBundlerResults" : true
}

```

### Bundling

![[Pasted image 20230119115336.png]]

2023-05-04-03:52
