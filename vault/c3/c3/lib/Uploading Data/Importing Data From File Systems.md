---
created: 2022-06-15T09:43:31-04:00
updated: 2022-06-15T09:43:31-04:00
title: Importing Data from File Systems
---

# Importing Data From File Systems

The C3 AI Suite has connectors to several storage systems, such as [AWS S3](https://developer.c3.ai/docs/7.30.0/topic/di-aws-s3-connector "topic di-aws-s3-connector.c3doc"), [Azure Blob Store](https://developer.c3.ai/docs/7.30.0/topic/di-azure-blob "topic di-azure-blob.c3doc"), and [HDFS](https://developer.c3.ai/docs/7.30.0/topic/di-hdfs-connector "topic di-hdfs-connector.c3doc"). There are C3 Types available to describe the location of the files to be processed and the structure of the data in the files. The C3 AI Suite then scans specific folders in the file system location for new files. If a new file is detected, the platform parses the file into the specified structure and loads the data.

## Getting Started

For the examples here assume a given a Canonical, `CanonicalFacility`, which is transformed to the entity `Facility`.

To specify loading via AWS S3, you must:

- Define a [FileSourceSystem](https://developer.c3.ai/docs/7.30.0/type/FileSourceSystem "type FileSourceSystem")
- Define a [FileSourceCollection](https://developer.c3.ai/docs/7.30.0/type/FileSourceCollection "type FileSourceCollection")

### Define a FileSourceSystem

```
FileSourceSystem.create({id:"BillingSys",name:"BillingSys"});
```

By default, the `FileSourceSystem` will point to the `DEFAULT` mount S3 bucket. See the [FileSystemMount](https://developer.c3.ai/docs/7.30.0/type/FileSystemMount "type FileSystemMount") Type documentation for more details.

To see the S3 bucket for the `DEFAULT` mount, run:

```
c3Grid(FileSourceSystem.s3.mounts());
```

If you want to use a different location, specify the alternate S3 bucket or path by setting:

```
FileSourceSystem.rootUrlOverride();
```

### Define a FileSourceCollection

To define a `FileSourceCollection`, you need to specify the [SourceSystem](https://developer.c3.ai/docs/7.30.0/type/SourceSystem "type SourceSystem") and the Source Type, which is the structure of the data arriving in that `FileSourceCollection`. The source of a `FileSourceCollection` is typically a Canonical Type:

```
FileSourceCollection.create({
        id:"Facility_Collection",
        name:"Facility_Collection"},
        source:{typeName:"CanonicalFacility"},
        sourceSystem: FileSourceSystem.get("BillingSys")
});
```

### Uploading Data

To upload files to the proper location in S3, invoke the `rootUrl()` API for a specific `FileSourceCollection`. The `rootUrl()` API provides the S3 location where to upload data files:

```
var fsc = FileSourceCollection.get("Facility_Collection");
fsc.rootUrl();
```

The `rootUrl` for a `FileSourceCollection` is typically a concatenation of the `rootUrl` of the `SourceSystem` and the `FileSourceCollection` name.

To pick up the files, you need to run `SourceFile.syncAll(<url>)`, where `<url` represents the desired (i.e. the bucket or any subfolder) location in S3. The C3 AI Suite will scan the S3 location and create entries for the new files in the [SourceFile](https://developer.c3.ai/docs/7.30.0/type/SourceFile "type SourceFile") C3 Type.

To process the files in the regular loading process, run `SourceFile.process()` on the selected files, or on all of them by running `SourceFile.processAll()`.

## Example

The diagram below shows an example AWS S3 integration:![DI-S3](https://developer.c3.ai/sites/default/files/2022-06/9bcc1aa1b408e4f1.png)

Here we have an external system from which we will extract two tables: Factory and Account. We know that Factory resembles a `CanonicalFacility` with some transformation needed. The Account table resembles the `CanonicalAccount` Type.

We are using the c3 bucket: `c3--env-pod-tenant-tag`.

### Creating the FileSourceSystem

a. We create one `FileSourceSystem` to represent that external system (`BillingSys`) and we set the `rootUrlOverride` to `c3--env-pod-tenant-tag/BillingSys`:

```
FileSourceSystem.create({id:"BillingSys",name:"BillingSys"});
FileSourceSystem.rootUrlOverride('c3--env-pod-tenant-tag/BillingSys');
```

### Creating the Source Type

We create a `FileSourceCollection` for `Facility_Collection`, but do not specify a Source Type. Instead, we rely on the `inferSourceType` to help us understand the CSV structure:

```
var inferredType = FileSourceCollection.make({
    id:"Factory",
    name:"Factory",
    sourceSystem:FileSourceSystem.get("BillingSys"),
    source:null}).inferSourceType()
});
```

From the result we see that the new Source Type should have 2 fields: `FactorySerial` and `FactoryCity`. We then create the Type manually and now have a `Factory` Type that has the same structure as the CSV file.

### Creating the FileSourceCollection Type

Now we upsert the `FileSourceCollection` declared above and point it to the `BillingSys` `FileSourceSystem` and the Factory Source Type.

### Creating the Transformations

We create a transformation from the new `Factory` Type to the `CanonicalFacility` with the needed changes. We provision the transformation. We're now ready to load data.

### Upload Data into AWS S3

The folder for a given `FileSourceCollection` can be determined by:

```
FileSourceCollection.get("Factory").rootUrl();
```

The above will return `s3://c3--env-pod-tenant-tag/BillingSys/Factory`.

A file can be uploaded via the AWS CLI or using the `/file` API:

AWS CLI:

`aws cp Factory001.csv s3://c3--env-pod-tenant-tag/BillingSys/Factory/`

C3 AI Suite `/file` API:

```
curl -v -H "Content-Type: text/csv;" -X PUT --data-binary @Factory001.csv https://<environmentURL>/file/1/<tenant>/<tag>/s3://c3--dev-dl-custenv/BillingSys/Factory/Factory001.csv -u <username>:<password>
```

You can verify that the files are available in the bucket using the following command:

```
FileSourceCollection.get("Factory").listFiles();
```

### Loading Data From AWS S3 into C3 AI Suite

```
SourceFile.syncAll() // Will show the uploaded files.
SourceFile.processAll() // Will process (chunk, transform, and persist) all SourceFile objects.
```

## Monitoring

After the loading process started via `SourceFile.process()` or `SourceFile.processAll()`, the corresponding `SourceFile` record will be updated to reflect the status. Subsequent fetches will show updated status, statistics, and updated time fields.

## See Also

- [Uploading Data](https://developer.c3.ai/docs/7.30.0/topic/di-uploading-data-home "topic di-uploading-data-home.c3doc")
