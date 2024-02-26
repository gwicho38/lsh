# Airgap Deployment Install Checklist

## Gathering Files

### IL6 Cloud

To deploy to the IL6 Cloud environment, we need:

- Action Runtimes
- Application Webpack Bundles
- Application Codebase

Infrastructure pipes new container images into the environment on
our behalf, so we don't have to collect those for this
environment.

### Standalone Environment

To upgrade the standalone environment (MTSI/Huntsville), we need:

- Containers
  - c3server-gov container
  - postgres-gov container
  - cassandra-gov container
  - jupyter container
  - atlas-s3 container
  - atlas-s3-data-creation container
  - atlas-ddb container
  - atlas-core container
  - atlas-api-vectortiles container
  - atlas-api-styles container
  - atlas-api-assets container
  - atlas-api-tilesets container
  - atlas-api-rastertiles container
- Container compose file
- Action Runtimes
- Application Webpack Bundles
- Application Codebase
- Any external repositories (e.g., base) the codebase relies upon

We may additionally need some Ansible scripts for facilitating
the deployment. Ask Mason about this.

The Atlas containers were provided to us by Mapbox. Somewhere,
there is a folder called Mapbox_Atlas that contains both
the containers and a relevant shell script. I'd also ask Mason
about this.

For c3server-gov containers, refer to: https://c3energy.atlassian.net/wiki/spaces/SAM/pages/8031994148/Release+Build+Information

We do not have juypter-gov containers.

## Transferring Files

### IL6 Cloud

At present, we transfer files into the environment by sending
them via DoD SAFE. Files must be of reasonable size to upload
here; we can chop up larger files with the UNIX `split` command
and recombine them with `cat` if need be.

Mike and/or Mason generally handles this at time of writing. It
can take a few days for the files to be cleared and allowed into
the environment.

Mike can optionally mail a DVD instead, but that is far less
preferred by all parties involved.

### Standalone Environment

At present, we burn a DVD (Mike's donating his collection) with
any files we want to transfer into the environment. We shred that
DVD after transferring files. We have to unlock one of the two
workstations to read the DVD. See
[odd-on-stig-rhel-7.md](odd-on-stig-rhel-7.md) for more
information.

## Installation

### MTSI

Mitch's `.bashrc` has an example of how to provision.

At first, Mapbox will fail for two reasons:
1) Token is not set (see failed request in Network tab for the token to use)
2) CORS. Open a new tab and type "thisisunsafe" in the address bar (Firefox)

Note also that UiSdlMapbox must be configured to point to the
air-gapped version of Mapbox (Atlas), rather than the public API.

### IL6 Cloud

Mason has a deployment container that automates the deployment
process.

## Updating ActionRuntimes

### IL6 Cloud

Validate prerequisites:

- `kubectl` installed and avaiable.
- Kubernetes cluster is currently running and not failing.
- Updated runtime channels (if applicable).

General Process:

  Updating the Conda ActionRuntime configuration in a Kubernetes cluster generally involves:

  1. Generating and exporting a compressed version of an offline channel \
  repository (described below in the `MTSI` section).

  2. Importing and extracting the compressed offline channel to the running instance \
  of c3server.

  2. Updating the `.condarc` file defined in terms of a "ConfigMap" to reflect the path \
  of the uploaded runtime channel repository.

Examine Kubernetes cluster:

- Get cluster Configuration Map: `kubectl get configmap`

- Get Specific Cluster Configuration: `kubect get configmap [-n $namespace] <configmap-key> [-o yaml/json]`

- Get Pods: `kubectl get pods [-n namespace]`

- Get Logs: `kubectl logs [-n namespace] [-p profile] services/c3 -f`

- View environment variables in "master" node: `printenv | grep conda`

Update and test configuration:

- Generate and export relevant Conda channels. See also [Generating Conda Pakcages for MDA ActionRuntime](https://c3energy.atlassian.net/wiki/spaces/FE/pages/7994213237/Generating+Conda+Packages+for+MDA+ActionRuntimes). 

- Create `configmap_patch.<json/yaml>` that modifies specific configuration retrieved above. 
  This will be used to add/remove the particular channels:

`kubectl patch configmap <configmap_name> --patch "$(cat configmap-patch.yaml)"`

- Validate updated configuration:

`kubectl get configmap <configmap_name> -o yaml`

### MTSI

Generating updated ActionRuntimes requires the following:

Prepare Containers:

- c3server container must be stopped.
- c3server container will ideally be 'raised' as a new artifact \
  to prevent contamination with other runtime artifacts.
- Once c3server container is running (desribed below) it is useful to validate mounts and \
  read/write access from/to docker/host.

Add Conda Mounts to docker-compose.yml for c3server:

  ```yaml
  - ./mount-c3server/conda/condarc.yml:/usr/local/share/c3/conda/.condarc
  - ./mount-c3server/conda/c3-conda-channel/:/c3-conda-channel
  - ./mount-c3server/conda/c3-jupyter-channel/:/c3-jupyter-channel
  ```

Edit `condarc` to download bz2 file format only:

  ```yaml
  # offline: True
  use_only_tar_bz2: True
  #channels:
  #  - c3-conda-channel
  #custom_multichannels:
  #  c3-conda-channel:
  #    - file:///c3-conda-channel
  #    - file:///c3-jupyter-channel
  #default_channels:
  #  - c3-conda-channel
  # allow_other_channels: False
  # restore_free_channel: False
  ```

Raise `c3server`:

  `docker-compose up -d c3server`

Connect to c3server:

  `docker exec -it c3server /bin/bash`

Validate mounts and Conda environment:

  Mounts:

  ```bash
  alias _dt="date +%Y_%m_%d_%H%M"
  ls /
  echo "Hello World" > /c3-conda-channel/`_dt`_hello_conda_channel.txt
  echo "Hello World" > /c3-jupyter-channel/`_dt`_hello_jupyter_channel.txt
  ```

  The files created should be visible and modifiable by the host at the local mount path.

Conda:

  ```bash
  > printenv | grep conda
  # example output
  CONDA_EXE=/usr/local/share/c3/conda/bin/conda
  OLDPWD=/c3-conda-channel
  CONDA_PREFIX=/usr/local/share/c3/conda
  CONDA_PYTHON_EXE=/usr/local/share/c3/conda/bin/python
  PATH=/usr/local/share/c3/conda/bin:/usr/local/share/c3/conda/condabin:/c3/scripts:/usr/local/go/bin:/usr/local/sbin:.:/usr/local/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/go/bin
  ...

  > conda env list

  # example output
  base                  *  /usr/local/share/c3/conda
  c3-r                     /usr/local/share/c3/conda/envs/c3-r

  ...

  > cat /usr/local/share/c3/conda/.condarc

  # example output

  # offline: True
  use_only_tar_bz2: True
  #channels:
  #  - c3-conda-channel
  #custom_multichannels:
  #  c3-conda-channel:
  #    - file:///c3-conda-channel
  #    - file:///c3-jupyter-channel
  #default_channels:
  #  - c3-conda-channel
  # allow_other_channels: False
  # restore_free_channel: False

  ```

The `condarc` will be modifiable from both the container/host in real time.

Provision Relevant Application:

  `c3 prov tag -t <tenant>:<tag> -c <packageName> -u BA:BA -e http://mdapts:8080 -a $PWD`

Install all ActionRuntimes for application provision:

```js

  // set c3fs
  var origFSDefault = FileSystemConfig.make().getConfig().default;
  FileSystemConfig.make().setDefault(FileSystemScheme.c3fs, ConfigOverride.TAG);
  var origDefaultMount = FileSystem.mounts()['DEFAULT'];
  var origExmfilesMount = FileSystem.mounts()['EXMFILES'];

  // prevent config from timing out
  var config = CondaActionRuntimeConfig.make().getConfig();
  config.setConfigValue("envInstallationTimeoutSeconds", 9999);

  // get all Python runtimes
  var rts = TagMetadataStore.runtimes('Python');
  // install runtimes
  for (var rt in rts) {
    try {
      ActionRuntime.forName(rt).ensureInstalled();
    } catch (e) {
      console.log(e); // note any failures
    }
  }
  ```

Create Offline Conda Channel:

- Follow the steps described here: [Generating Conda Pakcages for MDA ActionRuntime](https://c3energy.atlassian.net/wiki/spaces/FE/pages/7994213237/Generating+Conda+Packages+for+MDA+ActionRuntimes). 

## **Optional**

Save c3server container as image to preserve container state:

```bash
# saving image artifact
# docker ${container_hash} <image_name_desired>:<tag>
# example
docker abcd1234 my_saved_runtimes:1.0.0
```

Export docker container for persistence outside of docker runtime:

```bash
# docker export <container_name_or_id> > <output_file.tar>
# example
docker save abcd1234 -o my_saved_runtimes.tar
```

Import saved image for later use:

```bash
docker load -i my_saved_runtimes.tar
```
## References

- https://c3energy.atlassian.net/wiki/spaces/FE/pages/7994213237/Generating+Conda+Packages+for+MDA+ActionRuntimes
- https://c3energy.atlassian.net/wiki/spaces/FE/pages/7998636180/Collecting+Offline+Bundles