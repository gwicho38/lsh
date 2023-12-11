# C3 Cluster Helm Chart

## Overview

## Dependency Changes 

### c3-ray
---
##### Dependencies with client side Python Runtimes

Ray requires the client side Python version and dependencies to match those specified inside the Ray image (server side).
Although Ray builds “nightly” images which are updated every night, most of these do not meet the needs of C3. 
Concretely, we require dependencies specified by `py-server-modin`.

As of today, these images are manually customized by our developers. 
The below specifies the dependencies contained in our images.

##### Image Tag: c3ray-1.9.2-py3.9.12-1

This image contains the following dependencies:
- Python 3.9.12
- Ray 1.9.2
- Conda 4.13.0
- NumPy 1.22.2
- Modin 0.12.0
- Pandas 1.3.4
- PyArrow 6.0.1
- Protobuf 3.20.1
- S3FS 2022.2.0

##### Helm Chart: version 1.0.3

Options to specify image pull secret names have been added.

##### Image Tag: c3ray-1.9.2-py3.9.10-2

This image has the same dependencies as c3ray-1.9.2-py3.9.10-1, with the addition of:
- ADLFS 2022.04.0

##### Image Tag: c3ray-1.9.2-py3.9.10-1

This image contains the following dependencies:
- Python 3.9.10
- Ray 1.9.2
- NumPy 1.22.2
- Modin 0.12.0
- Pandas 1.3.4
- PyArrow 6.0.1
- S3FS 2022.2.0

##### Helm Chart: version 1.0.2

This Helm Chart by default uses the image `ci-artifacts.c3.ai/c3:c3ray-1.0.0`.

The description under Chart.yaml has also been updated.

##### Image Tag: c3ray-1.0.0

This image is customized to meet the needs of C3 Python runtimes (client side runtimes).

This image contains the following dependencies:
- Python 3.9.7
- Ray 1.9.2
- Modin 0.12.0
- PyArrow 6.0.1

### c3-persistence
---
#### version 3.1.0

These changes are intended to start Postgres / Cassandra as defined on the `infra/helm/charts/c3-persistence` directory.

### c3-nginx-ingress
---
#### version 4.0.1

To disable cluster role and cluster rolebinding following condition is added. This enables conditional creation of cluster role/rolebinding.
`disableClusterRole: true`

Major verison number for c3-nginx-ingress has been bumped to 4 to keep in par with original chart.

Latest ingress nginx chart has been used from the following repository. This has support for autoscaling based on custom metrics.
chart: ingress-nginx
version: 4.0.12
repository: https://kubernetes.github.io/ingress-nginx

#### version 1.0.3

This documentation is to note that there is currently a problem on Repoman that prevents artifacts from properly being updated or deleted. 

Package `c3-nginx-ingress-1.0.0.tgz` had the following error: `error converting YAML to JSON`, and required minor updates to be made. As a result, the original package was deleted from S3, and the modified package was subsequently pushed with the same version. Upon testing, `helm update dependency` would occasionally import the previously "deleted" package instead of the updated package.  

One possibility for this is when artifacts are deleted from the S3 storage, Repoman could be caching the files. As such, we are releasing the c3-nginx-ingress with a new version.  

#### version: 1.0.0

Using the official `nginx-ingress-1.28.0.tgz` package causes a ClusterRole/ClusterRoleBinding duplicate issue when having two or more deployments in different namespaces. As a solution, this forked version of nginx-ingress (i.e. `c3-nginx-ingress-1.0.0.tgz`) makes modifications by deleting the ClusterRole and ClusterRoleBinding files. 

However, the default behavior of the nginx-ingress-controller is to watch for all namespaces. Deleting the ClusterRole files causes the controller to throw an error: `cannot list resource <resource name> in API group ““ at the cluster scope`.

To solve this issue, we can change the behavior of the controller to only watch the namespace it is currently being deployed in by setting the flag `--watch-namespace` to the current namespace as found in `controller-deployment.yaml`. This can be configured in `values.yaml` by adding:

```yaml
c3-nginx-ingress:
  controller:
    scope:
      enabled: true
```

We then change `Chart.yaml` in  `c3-nginx-ingress-1.0.0.tgz`: 

```yaml
maintainers:
  - name: Kun Hwi Ko
  - email: KunHwi.Ko@c3.ai
name: c3-nginx-ingress
version: 1.0.0
```

Finally, we change line 28 of `helper.tpl` (i.e. definition of nginx-ingress.fullname) as below to prevent the field from being "c3-c3-nginx-ingress". These changes properly rename the ingress to be "c3-nginx-ingress".  

```
{{- printf "%s" $name | trunc 63 | trimSuffix "-" -}}
```

Note that this creates nginx-ingress for each namespace. If needed (e.g. production purposes), the deleted ClusterRole and ClusterRoleBinding files must be restored when reconfiguring to have a single nginx-ingress route to all namespaces in a cluster.  
