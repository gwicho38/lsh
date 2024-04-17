---
title: Uploading Data
created: 2022-05-20T11:49:39-04:00
updated: 2022-06-16T13:07:16-04:00
---

# Uploading Data

## Load Data From Files

There are multiple ways to load data into your application:

- Add seed data to your application package
- Load data using the REST API
- Load data using SFTP
- Load data using message queues

![[Pasted image 20220520114118.png]]

## REST API

There are two REST APIs available to load data from files:

	- `/file`: The file is uploaded and data is stored in a [[SourceSystem]], but not processed. Data can be processed at a later time using a [[SourceFile]].
	- `/immport`: When using the import API, the file is uploaded to the C3 AI Suite and the system looks for a [[FileSourceCollection]] associated with the canonical, stores the file in that location, creates an entry in [[SourceFile]], and triggers the entire data integration pipeline starting from that canonical.

The C3 AI Suite REST APIs provide programmatic access to read and write C3 AI Suite data. In addition to invoking application functions, canonical messages can be integrated and transformed via REST calls. To import canonical messages into C3 AI Suite, you POST the body of the message ot the canonical object URL.

After loading data, several things happen:

- Larger files, those greater than 10,000 rows, will be chunked into 10,000 row pieces for distributed processing.
- The [[SourceFile]] records will be updated with the upload and processing status. The [[DataloadProcess]] logs will also be updated. These Types can be fetched for more information.

The REST API can be invoked with:

```bash
curl \
  --request PUT \
  --header "authorization: $AUTH_TOKEN" \
  --header "accept: application/json" \
  --header "content-type: text/csv" \
  --url "http://$URL/import/1/$TENANT/$TAG/$CANONICAL/$REF_ID" \
  --data-binary @"$FILENAME"
```

Where:

| Variable   | Description                                            |
| ---------- | ------------------------------------------------------ |
| AUTH_TOKEN | An authentication token.                               |
| URL        | The url of the environment.                            |
| TENANT     | The tenant to import data into.                        |
| TAG        | The tag to import data into.                           |
| CANONICAL  | The Canonical to use when importing data.              |
| REF_ID     | A unique identifier of the file for reporting purposes |
| FILENAME   | The local path of the file to upload                   |

Depending on the type of file you are importing, use the following HTTP headers:

| Header           | Description                                                          | Possible Values                                                                                                              |
| ---------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Content-Encoding | Indicates if the content is zipped, and the server needs to unzip it | `gzip`                                                                                                                       |
| Content-Type     | Indicates the kind of file being uploaded                            | `text/csv`,`application/json`,`application/vnd.apache.parquet+binary`,`application/vnd.apache.avro+binary`,`application/xml` |

The REST API returns the following error codes:

| Code | Description                                                             |
| ---- | ----------------------------------------------------------------------- |
| 200  | Ok, the server received the file and is processing it                   |
| 400  | Bad request, the URL was called with wrong parameters                   |
| 415  | Unsupported media type, you tried uploading an unsupported file format. |
| 500  | Internal server error. The server is not healthy                        |

## Secure FTP

For users leveraging more traditional ETL processes, the C3 AI Suite provides each user with a secure FTP site that can be used for data loading.

In this scenario, you will upload your canonical messages to the secure FTP site on a periodic basis (hourly, daily, weekly), and a schedueld data load job will process the file and place its contents into a message queue, prompting data load processes subscribing to that queue to process, transform, and load the resulting data into C3 AI Suite.
