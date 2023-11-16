#!/usr/bin/env python3

# Copyright 2009-2022 C3 AI (www.c3.ai). All Rights Reserved.
# This material, including without limitation any software, is the confidential trade secret and proprietary
# information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
# strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
# This material may be covered by one or more patents or pending patent applications.

"""
Should be executed as `v8 chart`. Use `-h` for more info.

User story 1. Ensure CloudService(s) for C3 Server Bootstrapped in Local mode
v8 chart install -c jupyterhub | selenium           (select profile `small`)
http://test-local.test/c3/c3

User story 2. BootStrap C3 Cluster in K8s + Ensure CloudService(s)
v8 chart install                                    (select profile `medium`)
v8 chart install -c c3 jupyterhub selenium          (select profile `large`)
http://k8s.test/c3/c3

User story 3. Bootstrapped C3 server in Local + Start Env/App(2) in K8s to debug
http://k8s.test/c3/c3
"""

import logging
import os

import requests
import time
from requests.adapters import HTTPAdapter, Retry
from requests.structures import CaseInsensitiveDict

from subjects import k8s_local, minikube
from utils_local_setup import C3_SERVER_ROOT, execute_os_command, c3_cluster_url, load_c3, \
    uninstall_helm, configure_registry_secret, ask_user, fatal_error
from utils_python_cli_framework import cli, CliOption

chart = cli.subject(
    name='chart',
    help='C3 helper to prepare dev profile setup in minikube. It installs c3 helm chart to enable debugging through '
         'Intellij.',
    description='''
C3 helper to prepare dev profile setup in minikube. It installs c3 helm chart to enable debugging through Intellij.
''',
    common_options=[
        CliOption(['-p', '--profile'], {'help': 'Minikube VM profile to use.'}),
        CliOption(['-c', '--components'], {'help': 'C3 component(s) to install/uninstall. '
                                                   'Eg. "c3", "selenium", "c3 selenium", "c3 selenium jupyter"',
                                           'default': ['c3'], 'nargs': '*'}),
    ]
)

logger = logging.getLogger()
RELEASE_NAME_C3 = "c3"
RELEASE_NAME_LOCAL = "local"
ZONE = '.test'
CONTAINER_REGISTRY = "aksdevc3.azurecr.io"
NAMESPACE = 'test'
CLUSTER_NAME = 'v8'


def install_c3_helm(namespace, tag, host, context, release, suspend):
    logger.info('Namespace:"%s" K8s Context:"%s"', namespace, context)
    path = os.path.join(C3_SERVER_ROOT, 'platform/cloud-k8s/src/main/helm/c3')
    v8_infra_path = os.path.join(C3_SERVER_ROOT, 'infra/environments/v8')
    overlay_path = os.path.join(v8_infra_path, 'local/applications/config.yaml')

    logger.debug('Updating helm dependency')
    execute_os_command(f'helm dependency update {path}')
    # noinspection HttpUrlsUsage
    execute_os_command(f'helm upgrade --install'
                       f' --create-namespace'
                       f' --namespace {namespace}'
                       f' --values {overlay_path}'
                       f' --set c3.image.tag={tag}'
                       f' --set c3.cluster.name={CLUSTER_NAME}'
                       f' --set c3.leader.jvmDebug=true'
                       f' --set c3.leader.jvmSuspend={str(suspend)}'
                       f' --set c3.ingress.host={host}'
                       f' --set c3.ingress.install-nginx-controller=false'
                       f' --set c3.configFramework.config.local=/usr/local/share/c3/v8/server/config'
                       f' --set c3.configFramework.vault.local=/usr/local/share/c3/v8/server/vault'
                       f' {release} {path}')


def wait_for_c3_cluster(host):
    logger.info("URL to C3 cluster: %s", c3_cluster_url(host))
    url = f'{c3_cluster_url(host)}/api/8/Echo/echoEcho'

    headers = CaseInsensitiveDict()
    headers["Authorization"] = "Basic QkE6QkE="

    s = requests.Session()
    retries = Retry(total=10,
                    backoff_factor=5,
                    status_forcelist=[404, 403, 500, 502, 503, 504])
    # noinspection HttpUrlsUsage
    s.mount('http://', HTTPAdapter(max_retries=retries))
    logger.info("Waiting for C3 cluster to get ready")
    resp = s.get(url, headers=headers)
    if resp.status_code == 200:
        logger.info('C3 cluster is ready')
    else:
        fatal_error(f'C3 cluster not accessible: {host}\nC3 Cluster failed to start. Exiting.')


def _component_to_service(component):
    if component == "selenium":
        return c3.Selenium
    elif component == "jupyter":
        return c3.JupyterHub
    else:
        fatal_error(f'Component {component} is not supported')


def ensure_services(services):
    for service in services:
        logger.info("Ensuring %s CloudService", service)
        service.ensureService()


def stop_services(services):
    for service in services:
        logger.info("Stopping %s CloudService", service)
        try:
            service.terminate(True)
        except BaseException as e:
            logger.error(e)


def profile_selection(cluster, profile):
    suggested_profile = 'test' if cluster else 'dev'

    if not profile:
        profile = suggested_profile
    elif suggested_profile != profile:
        logger.warning('Minikube profile you entered (%s) is different from suggested profile (%s).',
                       profile, suggested_profile)
        if not ask_user(f'Would you like to continue with profile ({profile})? '
                        f'Otherwise, it will use the suggested profile ({suggested_profile})'):
            profile = suggested_profile

    return profile


def configure_cluster_config(namespace, context):
    """
    Temporary workaround
    TODO PLAT-51838 - Fix c3 helm chart and c3server to be able to run in local k8s
    """
    t_end = time.time() + 10 * 60  # 10 minutes timeout

    cmd = f'''
cd /usr/local/share/c3/server/;
sudo mkdir -p config/_cluster_/{CLUSTER_NAME}/App config/_cluster_/{CLUSTER_NAME}/Env;
sudo echo "[{{\\"taskNodeCount\\":0,\\"dataNodeCount\\":0,\\"leaderNodeCount\\":1,\\"id\\":\\"{CLUSTER_NAME}-c3-c3\\",\\"name\\":\\"c3\\",\\"code\\":1,\\"mode\\":\\"dev\\"}}]" > config/_cluster_/{CLUSTER_NAME}/App/{CLUSTER_NAME}-c3-c3.json;
sudo echo "[{{\\"name\\":\\"c3\\",\\"singleNode\\":false,\\"id\\":\\"{CLUSTER_NAME}-c3\\",\\"configuredCloudNamespace\\":\\"{NAMESPACE}\\"}}]" > config/_cluster_/{CLUSTER_NAME}/Env/{CLUSTER_NAME}-c3.json
    '''

    while time.time() < t_end:
        time.sleep(10)
        try:
            execute_os_command(f"kubectl --context={context} --namespace={namespace} exec -it "
                               f"deploy/{CLUSTER_NAME}-c3-c3-k8sdeploy-appleader-001 -c c3-server -- bash -c '{cmd}'",
                               fail_on_error=False)
        except:
            pass
        else:
            return


def install_cluster(profile, namespace, tag, hostname, suspend):
    logger.info('Installing "c3" helm chart and configure it. This may take a while.')
    try:
        minikube.start(profile)
        configure_registry_secret(namespace, CONTAINER_REGISTRY, profile)
        install_c3_helm(namespace, tag, hostname, profile, RELEASE_NAME_C3, suspend)
        configure_cluster_config(namespace, profile)
        wait_for_c3_cluster(hostname)
        load_c3(hostname)
        c3.AppUrl.make({'id': hostname}).setConfig(c3.ConfigOverride.CLUSTER)
        logger.log(logging.INFO + 1, 'C3 Server configured and ready for use')
        logger.log(logging.INFO + 1, f'Url: {c3_cluster_url(hostname)}/static/console')
    except BaseException as e:
        logger.error('C3 cluster installation did not complete.')
        raise e


@chart.command(options=[
    CliOption(['-t', '--tag'], {'help': 'c3 server tag for image ci-artifacts.c3.ai/c3', 'default': '8.2.0'}),
    CliOption(['-s', '--suspend'], {'help': 'Start C3 server in suspend mode and enable debug',
                                    'action': 'store_true'}),
])
def install(components, tag, suspend, profile=None):
    """Install c3 cluster (if c3 specified in components) and start services."""
    namespace = NAMESPACE
    is_cluster = 'c3' in components
    profile = profile_selection(is_cluster, profile)
    components = list(c for c in components if c != "c3" and c != "local")
    hostname = f'c3.{"local" if profile == "dev" else "k8s"}{ZONE}'

    # Install helm chart and ensure cloudServices
    if install:
        if is_cluster:
            install_cluster(profile, namespace, tag, hostname, suspend)
        else:
            k8s_local.configure()
            load_c3(hostname)

        if components:
            logger.info('Installing components')
            ensure_services(list(_component_to_service(c) for c in components))


@chart.command()
def uninstall(profile, components):
    """Stop specified services and terminate cluster if it was started."""
    namespace = NAMESPACE
    is_cluster = 'c3' in components
    profile = profile_selection(is_cluster, profile)
    components = list(c for c in components if c != "c3" and c != "local")
    hostname = f'c3.{profile}-local{ZONE}'

    if components:
        try:
            load_c3(hostname)
            stop_services(list(_component_to_service(c) for c in components))
        except BaseException:
            logger.error('Cannot terminate services')

    if is_cluster:
        uninstall_helm(namespace, RELEASE_NAME_C3, profile)
    else:
        k8s_local.clear()
