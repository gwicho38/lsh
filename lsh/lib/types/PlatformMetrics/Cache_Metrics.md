---
created: 2022-02-23T15:29:49-05:00
updated: 2022-02-23T15:41:01-05:00
title: Cache Metrics
---

# Cache Metrics

Evaluating [Metrics](Metrics.md) can be computationally expnsive.

You can improve the UX and save compute by caching a [Simple Metric](Simple%20Metric) result. The first time the metric is evaluated, the result is stored in a cache. After that, the cached value is returned, thus avoiding computing the metric again.

For the cache to be automatically invalidated upon arrival of changes of the underlying metric's data, [MetricDependency](MetricDependency) must include this metric as an entry.

See [Simple Metric > Cache](Simple%20Metric#Cache) for more info on updating [MetricDependency](MetricDependency).

## Define a Metric with Cache

To cache a [Simple Metric](Simple%20Metric), add the `cache` field to the metric definiiton

```
{
  "id": "AveragePower_SmartBulb",
  "name": "AveragePower",
  "srcType": "SmartBulb",
  "description": "Average power over time of the smart bulb",
  "path": "bulbMeasurements",
  "expression": "avg(avg(normalized.data.power))",
  "cache": {
    "intervals": ["DAY", "MONTH"],
    "monthsInPast": 4,
    "monthsInFuture": 1
  }
}
```

In this example, the metric is cached at both the day and month intervals for the past four months, and one month in the future.  Do `c3ShowType(SimpleMetricCacheSpec)` to learn moer

## Check if Metric is Cached

You can check if a a specific interval has been cached or not:

```
metric = SimpleMetric.get({id: "exampleMetricId"});
metric.cacheRange("exampleInstanceId", Interval.HOUR)
```

## Invalidate a Cached Metric

You can also invalidate a cached metric result:

```
mis = MetricInvalidationSpec.make({
  metricName: "exampleMetric",
  objId: "exampleInstanceId",
  timeRanges: [{
    start: "2021-01-01T00:00:00",
    end: "2021-02-01T00:00:00"
  }],
  typeId: Tag.getTypeId(null, "exampleType")
});

specAry = MetricInvalidationSpec.array();
specAry.push(mis)

// see doc on invalidateCache for more details
SimpleMetric.invalidateCache(specAry);
```
