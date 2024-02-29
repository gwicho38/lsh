---
id: offline-bundling
created_date: 21/12/2022
updated_date: 21/12/2022
type: note
---

# offline-bundling

## 📝 Notes

21/12/2022:12:55

```js 

// collecting offline bundles
// Define `package` as your application package name
var package = 'mdaGTO';
var zipName = '2023-05-04-gto-bundles.zip';
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

## 🔗 Links

## **🏷️Tags**

- 
