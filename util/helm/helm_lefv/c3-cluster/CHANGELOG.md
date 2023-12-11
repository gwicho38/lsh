# CHANGELOG

## [4.19.2]  - 2022-03-11

### Changed

- master node readiness check
  *`periodSeconds` increased to 60 seconds
  * `timeoutSeconds` increased to 30 seconds
  * `failureThreshold` increased to 5

## [4.19.1]

### Added

- templates for scheme and canonical URL

### Changed

- reference to zookeeper chart to `ci-artifacts.c3.ai`
- handling of `c3-config` and `c3-vault` volume mounts
- appVersion to `7.28.0.1288`

## [4.18.0] - 2021-12-24

### Added

- `ClusterConfig` inferred from installation configuration

### Fixed

- redirect loop in ingress controller

### Changed

- `appVersion` bumped to `7.28.0.1110`
- `appVersion` used as the default image tag
- Postgresql `serverEndpoint` calculated dynamically
- (single node K8s cluster) configuration and secrets (vault) stored in `hostPath` volumes with access mode `readWriteMany`

## [4.17.5] - 2021-12-09

### Changed

- Reverted mount path change from /c3-cluster-shared to /usr/local/share/c3/fs

## [4.17.4] - 2021-11-29

### Removed

- conditional wrappers on statements related to Web Security Enablement from configmap.

## [4.17.3] - 2021-11-16
### Fixed
- Added K8S_CORS_ENABLED, K8S_VARY_HEADER, K8S_CC_HEADER_ENABLED, K8S_XSS_HEADER_ENABLED, K8S_XSS_BLOCKMODE_ENABLED, K8S_XFO_HEADER, K8S_CSP_HEADER to configmap, relating to Web Security enablement.

## [4.17.2] - 2021-11-15
### Fixed
- Publish 7.28 Helm Chart

## [4.17.1] - 2021-11-12
### Changed
- Updated mount path from /c3-cluster-shared to /usr/local/share/c3/fs

## [4.17.0] - 2021-11-08
### Added
- Added functionality to store npm, tmp, c3Log, serverConf files in persistent storages

## [4.16.1] - 2021-11-07
### Added
- Updated kubeVersion to include pre-releases to be compatible with eks and gke clusters.

## [4.16.0] - 2021-11-05
### Added
- Added values.schema.json for this helm chart
- Added helm test
- Added kuberVersion Values.yaml
- Replaced busybox by `ubi/ubi8-gov`

## [4.15.0] - 2021-11-01
### Added
- Added option to supply supplementalGroups

## [4.14.0] - 2021-10-24
### Added
- Added support to configure K8S_CONFIG_FS_REGION, K8S_CONFIG_FS_OWNER, K8S_VAULT_FS_REGION variables through overlays.

## [4.13.1] - 2021-10-21
### Removed
- `tenants` JdbcStoreConfig (unused)

## [4.13.0] - 2021-10-07
### Added
- Changed ingress http path

## [4.12.0] - 2021-10-01
### Changed
- Use the existing image pull secret to pass into helm chart instead of passing the credentials for authenticated image repository.

## [4.11.0] - 2021-10-04
###Fixed
- Fixed the logic for setting the K8S_ZK_SERVERS variable in configmap (Change in 4.10.0 had removed checking and setting the value to Values.c3Cluster.zookeeperClient.hosts).

## [4.10.0] - 2021-09-29
### Added
- Added Zookeeper TLS related environment variables to configmap.

## [4.9.0] - 2021-09-16
### Added
- Added config for secret volume and mountpath that contains the token required to authenticate with Vault CA.

## [4.8.0] - 2021-09-14
### Added
- Added c3 tmp dir in ephemeral storage

## [4.7.0] - 2021-09-07
### Added
- Added config for TLS secret volume and mountpath  - requires C3 server 7.25 or newer.

## [4.6.0] - 2021-07-20
### Added
- Added support for OpenShift Service Mesh, with "sidecar.istio.io/inject" annotation - requires C3 server 7.25 or newer.

## [4.5.0](https://ci-artifacts.c3.ai/v1/artifacts/helm-repo/helms/c3-cluster-4.5.0.tgz) - 2021-06-28
### Added
- Added support for c3-cluster bootstrap node to pull image from an authenticated registry. Added new `values.yaml` configuration element `Values.c3Cluster.image.dockerconfigjson` to create registry secret given dockerconfigjson and inject this secret for image pull from an authenticated registry.

## [4.4.0] - 2021-06-11
### Changed
- Replaced obsolete `extensions/v1beta1` apiVersion with `networking.k8s.io/v1` in the Ingress template, updated the Ingress template accordingly to bring it in sync with the new apiVersion.

## [4.3.0](https://ci-artifacts.c3.ai/v1/artifacts/helm-repo/helms/c3-cluster-4.3.0.tgz) - 2021-05-26

### Added
- Added support for config, vault and sharedFileSystem storage amount request configuration, for the case the storage is provided by PVC volumes. Added new `value.yaml` configuration elements (`c3Cluster.configFramework.config.nfs.storage`, `c3Cluster.configFramework.vault.nfs.storage` and `c3Cluster.sharedFileSystem.nfs.storage`) and updated the templates to support them.

## 4.2.0 - 2021-05-25

### Changed
- Upgraded c3-persistence to 3.1.0, which now comes with OPS postgresql 11.10+2.

## [4.0.7](https://ci-artifacts.c3.ai/v1/artifacts/helm-repo/helms/c3-cluster-4.0.7.tgz) - 2021-05-14

### Fixed
- Prevented the deployment of the c3-debug service unless `.c3Cluster.launchOptions.debug` is explicitly turned on. There is no need to have the service laying around if the server is not in debug mode. Moreover, the service does not fully start in EKS, causing `helm install --wait --timeout` to time out even if the server is up and running.

## 4.0.6 - 2021-04-21

### Fixed
- Fixed `Error: template: c3-cluster/templates/configmap.yaml:43:31: executing "c3-cluster/templates/configmap.yaml" at <.Values.c3Cluster.resources.limits.memory>: nil pointer evaluating interface {}.memory` caused by the attempt to evaluate a missing `c3Cluster.resource.limits` map. This defect prevented deployment when no resource limits were provided.