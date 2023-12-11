#TODO PLAT-53068 Package and upload c3 helm chart to repoman on every build
#Please push this chart into repoman until fully automated.
Check for section [Manual chart Release](../../../../../../infra/guides/c3-on-kubernetes-ci-operations-manual.md)

# Changelog

## [8.3.2] 2023-05-09
- Added ["csidrivers", "csistoragecapacities"] resources on clusterrole `c3`

## [8.3.1] - 2023-03-02

### Added
- Added C3 App Overview and C3 Cluster dashboard. These dashboards are Custom Resources on GrafanaDashboard.

## [8.3.0] - 2023-02-09

- Bump helm chart version to 8.3.0
- Removed obsolete dependent helm charts

## [8.2.0] - 2022-11-23

- Released 8.2.0 helm chart

## [0.7.0] - 2021-02-01

### Added
- side-car container for log streaming to stdout
