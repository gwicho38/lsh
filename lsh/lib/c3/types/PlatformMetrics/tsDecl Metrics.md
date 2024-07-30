---
created: 2022-02-23T14:41:29-05:00
updated: 2022-02-23T16:29:28-05:00
title: tsDecl Metrics
---

# tsDecl Metrics

Often the raw data that is not modeled as [Timeseries](Timeseries) must be converted and used in a metric.

For example, event data, status data, or something that does not continuously have information. These can be an outage event -- which are random and last for minutes to hours at a time -- or status data that indicate if and when equipment is on or off.

[Metrics](Metrics.md) for this type of data are a special kind of [Simple Metric](Simple%20Metric) called a tsDecl Metric or Timeseries Declaration metric

## Difference From Standard Simple Mertic

The normalization process for the standard metric is defined by the timeseries data model that describes to the data that the metric is analyzing, whereas a tsDecl metric defines the normalization process in the metric itself, and a time series is created at run-time.

In a standard metric, the path field should traverse from the source type to the TimeseriesHeader type. From there, the expression references the fields on the TimeseriesHeader type, normally in the form of "normalized.data.value".

In a tsDecl metric, the path should lead from the SourceType to a type that has a **direct reference to an array of Collection Types**. This collection type doesn't have to be a timeseries type, and in fact often will not be. It can be an entity type that data has been loaded into.

This difference exists because in a standard metric, there is a C3 Type (often TimeseriesHeader) between the data points and the SourceType.

For example, from the SourceType, there is usually a field called 'measurements' that references an array of TimeSeriesHeaders. However, in the use case of tsDecl metrics, the array of CollectionTypes exists directly on the SourceType, so the TSDecl.data field should lead to that collection that is being used to create a normalized time series from.

## tsDecl Definition

Below are a few key fields within the tsDecl object in the metric definition:

- **data** (string): Value of this field should always yield in a field at the end of the path that is a foreign-key array containing the timed data points

- **treatment** (string*_): Indicates how to convert data points to time-series data. It specifies the kind of treatment applied for aggregation or disaggregation on the data for metric creation and also for normalization. See Treatment for options._

- **start** (string): Start date expression on the data points

- **end** (string): End date expression on the data points (optional in case of point data)

- **value** (string): Expression on the data points (optional). Multiple options are supported:

- Convert something like a string or a status into a number that can be aggregated into a timeseries.

- Value that will be carried out throughout the timeseries

- A value directly from a field on the collection type

- Left undefined or empty if the treatment selected already determines the value to be returned. (For example the COUNT Treatment)

- **filter** (string): Filter to be applied on the data points (optional)

- **transform** (string): Transformation applied on the value expression (optional)

- Typical to fill missing with this step

- **overlapHandling** (string): Indicates how to handle overlap data points when converting to a time series. Options are "AVG", "MIN", "MAX", "SUM" and default is "AVG"

- **rollupFunc** (string): Indicates how to aggregate across space individual timeseries constructed at the end of path using the time series declaration. Options are "OR", "AND", "SUM", "AVG", "MIN", "MAX", "MEAN", "MEDIAN", "VARIANCE", "STDDEV". Default is null and all the data points for all end of path objects will be fed into a single timeseries

## Mapping Simple Metrics to tsDecl Metrics

![](Pasted%20image%2020220223144556.png)

## Examples

### Discontinuous Point Events

```json
{
   "id": "WorkLogEvent_SmartBulb",
   "name": "WorkLogEvent",
   "description": "Status (1 or 0) indicating if the smart bulb has a work log event",
   "srcType": "SmartBulb",
   "tsDecl": {
     "data": "bulbWorkLogs",
     "value": "1",
     "treatment": "OR",
     "start": "timestamp"
   }
 }
```

And another one with [Cache Metrics](Cache%20Metrics.md) functionality

```json
{
  "name": "PartsRemovedPredictivelyTimeseries",
  "srcType": "Aircraft",
  "path": "assets",
  "tsDecl": {
    "data": "maintenanceActions",
    "start": "end",
    "treatment": "COUNT",
    "overlapHandling": "SUM",
    "filter": "adjudicatedType == 'CBM_RECOMMENDED_R2' && asset.wuc.inScopeForRulAnalysis == true"
  },
  "id": "PartsRemovedPredictivelyTimeseries_Aircraft",
  "cache": {
    "intervals": [
      "HOUR",
      "DAY",
      "MONTH",
      "YEAR"
    ],
  "monthsInPast": 36
  }
}
```

### Continuous Enumerated

```json
{
   "id": "PowerGridStatus_SmartBulb",
   "name": "PowerGridStatus",
   "description": "Status (1 or 0) indicating ON or OFF of the PowerGrid over time",
   "srcType": "SmartBulb",
   "path": "fixtureHistory.to.apartment.building",
   "tsDecl": {
     "data": "gridStatusSet",
     "value": "value",
     "treatment": "PREVIOUS",
     "start": "timestamp"
   }
 }
```
