---
title: Uploading Data - Examples
created: 2022-05-20T11:50:32-04:00
updated: 2022-05-20T11:50:32-04:00
---

# Uploading Data - Examples

## CSV

### HTTP without compression*

```
curl -H "Content-Type: text/csv" -X PUT --data-binary @<<file>.csv http://<<HostName>>/import/1/<<tenant>>/<<tag>>/<<CanonicalTypeName>>/<<filenameidentifier>> -u <<username>>:<<password>> -v
```

For example, if you want to import `CanonicalCustomerOrganization` onto the tenant `tenant1` and the tag `tag1`, and host is `localhost`, the file you want to import is `customerinformation110114.csv`, and `user/password` are `abc:abc`, then the curl command would be:

```
curl -H "Content-Type: text/csv" -X PUT --data-binary @customerinformation110114.csv http://localhost:8080/import/1/tenant1/tag1/CanonicalCustomerOrganization/customerinformation110114 -u abc:abc -v
```

### HTTP with compression*

```
curl -H "Content-Type: text/csv" -H "Content-Encoding: gzip" -X PUT --data-binary @<<file>.csv.gz http://<<HostName>>/import/1/<<tenant>>/<<tag>>/<<CanonicalTypeName>>/<<filenameidentifier>> -u <<username>>:<<password>> -v
```

For example, if you want to import `CanonicalCustomerOrganization` onto tenant `tenant1` and tag `tag1`, host is `localhost`, file you want to import is `customerinformation110114.csv`, user/password are `abc:abc`, the curl command would be:

```
curl -H "Content-Type: text/csv" -H "Content-Encoding: gzip" -X PUT --data-binary @customerinformation110114.csv.gz http://localhost:8080/import/1/tenant1/tag1/CanonicalCustomerOrganization/customerinformation110114 -u abc:abc -v
```

### HTTPS without compression*

```
curl -H "Content-Type: text/csv" -X PUT --data-binary @<<file>.csv https://<<HostName>>/import/1/<<tenant>>/<<tag>>/<<CanonicalTypeName>>/<<filenameidentifier>> -u <<username>>:<<password>> -v --ssl
```

For example, if you want to import `CanonicalCustomerOrganization` onto tenant `tenant1` and tag `tag1`, host is `localhost`, file you want to import is `customerinformation110114.csv`, user/password are `abc:abc`, the curl command would be:

```
curl -H "Content-Type: text/csv" -X PUT --data-binary @customerinformation110114.csv https://localhost:8080/import/1/tenant1/tag1/CanonicalCustomerOrganization/customerinformation110114 -u abc:abc -v --ssl
```

## JSON

```
curl -H "Content-Type: application/json" -X PUT --data-binary @<<file>.csv http://<<HostName>>/import/1/<<tenant>>/<<tag>>/<<CanonicalTypeName>>/<<filenameidentifier>> -u <<username>>:<<password>> -v
```

For example, if you want to import `CanonicalCustomerOrganization` onto the tenant `tenant1` and the tag `tag1`, and host is `localhost`, the file you want to import is `customerinformation110114.json`, and `user/password` are `abc:abc`, then the curl command would be:

```
curl -H "Content-Type: application/json" -X PUT --data-binary @customerinformation110114.json http://localhost:8080/import/1/tenant1/tag1/CanonicalCustomerOrganization/customerinformation110114 -u abc:abc -v
```

### Nested JSON

When importing hierarchical data, you must first define every hierarchical level as its own Type. For the following example.json:

```
{
 "Id": "5d555",
 "RunId": "Default",
 "ParentId": {
  "value": "5"
    }
}
```

You would define the following canonicals and transforms:

```
type CanonicalRunInfo mixes Canonical<CanonicalRunInfo>{
    Id: string
    RunId: string
    ParentId: Child
}

type TransformCanonicalRunInfoToRunInfo mixes RunInfo transforms CanonicalRunInfo{
    id: ~ expression "Id"
    runId: ~ expression "RunId"
    parentId: ~ expression {value: "ParentId"}
}

entity type RunInfo schema name "RUN_INFO"{
    runId: string
    parentId: Child
}

entity type Child schema name "CHILD" {
    value: integer
}
```

## XML

```
curl -H "Content-Type: application/xml" -X PUT --data-binary @<<file>.xml https://<<HostName>>/import/1/<<tenant>>/<<tag>>/<<CanonicalTypeName>>/<<filenameidentifier>> -u <<username>>:<<password>> -v
```

For example, if you want to import `CanonicalCustomerOrganization` onto tenant `tenant1` and tag `tag1`, host is `localhost`, file you want to import is `customerinformation.xml`, user/password are `abc:abc`, the curl command would be:

```
curl -H "Content-Type: application/xml" -X PUT --data-binary @customerinformation.xml http://localhost:8080/import/1/tenant1/tag1/CanonicalCustomerOrganization/customerinformation.xml -u abc:abc -v
```

## Parquet

```
curl -H "Content-Type: application/vnd.apache.parquet+binary" -X PUT --data-binary @<<file>.xml https://<<HostName>>/import/1/<<tenant>>/<<tag>>/<<CanonicalTypeName>>/<<filenameidentifier>> -u <<username>>:<<password>> -v
```

For example, if you want to import `CanonicalCustomerOrganization` onto tenant `tenant1` and tag `tag1`, host is `localhost`, file you want to import is `customerinformation.parquet`, user/password are `abc:abc`, the curl command would be:

```
curl -H "Content-Type: application/vnd.apache.parquet+binary" -X PUT --data-binary @customerinformation.parquet http://localhost:8080/import/1/tenant1/tag1/CanonicalCustomerOrganization/customerinformation.parquet -u abc:abc -v
```

## Avro

```
curl -H "Content-Type: application/vnd.apache.avro+binary" -X PUT --data-binary @<<file>.xml https://<<HostName>>/import/1/<<tenant>>/<<tag>>/<<CanonicalTypeName>>/<<filenameidentifier>> -u <<username>>:<<password>> -v
```

For example, if you want to import `CanonicalCustomerOrganization` onto tenant `tenant1` and tag `tag1`, host is `localhost`, file you want to import is `customerinformation.avro`, user/password are `abc:abc`, the curl command would be:

```
curl -H "Content-Type: application/vnd.apache.avro+binary" -X PUT --data-binary @customerinformation.avro http://localhost:8080/import/1/tenant1/tag1/CanonicalCustomerOrganization/customerinformation.avro -u abc:abc -v
```
