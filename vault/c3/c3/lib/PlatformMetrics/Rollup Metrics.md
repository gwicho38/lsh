---
created: 2022-02-23T15:26:37-05:00
updated: 2022-02-23T15:41:05-05:00
title: Rollup Metrics
---

# Rollup Metrics

Rollup [Metrics](Metrics.md), available in `MetricEvaluatable`, are a way of combining Timeseries from all sources into a single Timeseries to be used for a single metric.

## Definition

[Metrics](Metrics.md) can be rolled up by aggregating results of all sources into a single Timeseries per metric by using `rollupMetrics` on `MetricEvaluatable`.

The `rollupMetrics` API `rollupMetrics(spec): map<string, Timeseries>` takes in a `RollupMetricSpec` which contains the same fields as the `EvalMetricsSpec` and a few additional fields.

- `rollupFunc` (string): Aggregation function to be used to roll up results of all individual sources into one Timeseries.

- Options are `OR`, `AND`, `SUM`, `AVG`, `MIN`, `MAX`, `MEAN`, `MEDIAN`, `VARIANCE`, `STDDEV`, `PERCENTILE`.

- `percentileValue` (double): Percentile to be computed if the `rollupFunc` is PERCENTILE.

## Examples

Below is an example of how to create a `rollupmetric` spec and the result.

This metric aggregates the Average Power of all SmartBulbs that have Philips as their manufacturer.

```
var spec = RollupMetricSpec.make({
  filter: Filter.eq('manufacturer', 'Philips'),
  expressions: ["AveragePower"],
  start: "2013-01-01",
  end: "2013-03-01",
  interval: "DAY",
  rollupFunc: "SUM"
});
var result = SmartBulb.rollupMetrics(spec);
```

![](Pasted%20image%2020220223152605.png)
