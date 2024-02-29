---
created: 2022-02-23T15:35:04-05:00
updated: 2022-02-23T15:40:59-05:00
title: Deploying Metrics
---

# Deploying Metrics

When persisting developed [Metrics](Metrics.md) into C3 AI suite, the metircs should be defined in JSON files.

```ad-note
A single file may contain one *or many* metric definitions. It is just seed data like any other.
```

Metric seed files must be in the `seed/` directory under the application directory.  Thus, they need to be organized into directories [SimpleMetric](Simple%20Metric)/ and [CompoundMetric](Compound%20Metric)/

![](Pasted%20image%2020220223153314.png)

==You can run `SmartBulb.listMetrics()` from the conosle to list al metrics that are available on the SmartBulb type==.

**Example**

```json
{
  "id": "ManufacturerNameStartsWithG_SmartBulb",
  "name": "ManufacturerNameStartsWithG",
  "srcType": "SmartBulb",
  "expression": "startsWith(lowerCase(manufacturer.name), 'g')"
}
```

## Deploying Metrics in the Console

Metrics can also be defined and deployed in the console on the via the following syntax: `<MetricType>.make()`

However, if you choose to define metrics in this way, and not persist them to the code base, they will not be saved during provisioning and will disappear.

Examples: `SimpleMetric.make()`, `CompoundMetric.make()`.
