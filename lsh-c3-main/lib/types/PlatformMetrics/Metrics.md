---
created: 2022-02-23T15:16:40-05:00
updated: 2022-02-24T12:36:17-05:00
title: Metrics
---

# Metrics

Metrics are instructions for how to transform data that is modeled as timeseries, into Timeseries data. Metrics are used ot produce Timeseries objects in the C3 AI Suite.

Consider a timeseries data model for one SmartBulb object as below:

**SMBLB1**

| time  | lumens | power | temperature | voltage | status |
| ----- | ------ | ----- | ----------- | ------- | ------ |
| 12:00 | 0      | 0     | 0           | 0       | OFF    |
| 12:15 | 20     | 36    | 95          | 15      | ON     |
| 12:30 | 24     | 36    | 96          | 17      | ON     |
| 12:45 | 0      | 0     | 70          | 0       | OFF    |

Metrics are declarative, and they can be re-used in various contexts. Metrics are the fundamental building blocks for downstream use cases: they are the trigger for analytics, can be displayed in the UI, and they are also key inputs for feature vectors in Machine Learning classifiers.

## How Metrics Work

There are two categories of metrics: simple and compound.

1. Simple metrics create a prepared Timeseries out of (properly modeled) data.
2. Compound metrics allow manipulation of existing Timeseries. By applying logical or mathematical operations, compound metrics can be a combination of one or many simple and compound metrics to create unique logic based on one or more time series.

Metrics are considered metadata, meaning they describes the application and can be changed by developers at will. Metrics are defined in JSON files, are expression based, and live in the seed folder.

![](Pasted%20image%2020220223152224.png)

## Metric Workflow

![](Pasted%20image%2020220223152239.png)

he workflow for metrics begins with the data integration. This is the raw data coming into the environment, often from an external place like a file or a database.

This data is then moved into a C3 Database still as raw information, modeled as timeseries, and processed by the C3 Normalization Engine; where the raw data is cleaned and transformed.

Developers then create simple metrics with this normalized data and create one or many Timeseries. The simple metrics can either be evaluated or be fed into compound metrics.

After a metric is evaluated, the result can be visualized and inspected. After the metric is confirmed to work as expected, metric are then deployed and debugged.

Note that metrics can be created using Javascript in IDE and then provisioning or using Python in Juypter Notebooks on the fly. You can also create metrics on the fly in the console. All these aspects will be covered in more detail in the rest of the Module.

## Combining Metrics

![](Pasted%20image%2020220223152307.png)

Metrics can be combined to create complex logic. Beginning with raw data (Raw Data A and Raw Data B), the data is first converted into time series by creating two separate simple metrics: simple metric A, and simple metric B.

Compound metrics (A1 and B2) are created using simple metrics A and B. It's also possible to again create compound metrics using compound metric A1 and compound metric B1, called compound metric AB2.

Metric creation can be taken even further. It is possible to create compound metrics using simple metric B and compound metric AB2, called compound metric A1AB2.

SimpleMetrics are the building blocks, and CompoundMetrics can combine any number of SimpleMetrics and other CompoundMetrics to create unique logic, based on one or more Timeseries.
