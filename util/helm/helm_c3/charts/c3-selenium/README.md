# C3 Selenium Helm Chart

[Up](../../README.md)

## Overview

This is a Selenium chart with two deployments for Chrome and Firefox - each with a separate Selenium server.

It exists to wrap C3-specific selenium configuration in its [values.yaml](./values.yaml)
and to reuse it from other charts.

NOTE: this will shortly be replaced by the official Selenium chart with a single Selenium server (hub) and multiple browsers (nodes).
