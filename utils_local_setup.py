#!/usr/bin/env python3

# Copyright 2009-2022 C3 AI (www.c3.ai). All Rights Reserved.
# This material, including without limitation any software, is the confidential trade secret and proprietary
# information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
# strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
# This material may be covered by one or more patents or pending patent applications.

import base64
import json
import os
import platform
import subprocess
import urllib.error

import sys
import logging
import socket
import builtins
import time


# Configure logger
class FormatWithColors(logging.Formatter):
    COLOR_MAP = {
        logging.DEBUG: '\x1b[34;20m',  # blue
        logging.INFO: '\x1b[38;20m',    # white
        logging.INFO + 1: '\x1b[32;20m',    # green
        logging.WARNING: '\x1b[33;20m',  # yellow
        logging.ERROR: '\x1b[31;20m',  # red
        logging.CRITICAL: '\x1b[31;1m'  # bold red
    }

    def __init__(self, record_format):
        super().__init__()
        self._colors = True
        self._default_formatter = logging.Formatter(record_format)
        self._formatters = {level: logging.Formatter(color + record_format + '\x1b[0m')
                            for level, color in self.COLOR_MAP.items()}

    def no_colors(self, flag):
        self._colors = not flag

    def _formatter(self, level):
        return self._formatters.get(level, self._default_formatter) if self._colors else self._default_formatter

    def format(self, record):
        return self._formatter(record.levelno).format(record)


logger = logging.getLogger()
ch = logging.StreamHandler()
ch.setLevel(logging.DEBUG)
formatter = FormatWithColors('[%(levelname)s] %(message)s')
ch.setFormatter(formatter)
logger.addHandler(ch)
logger.setLevel(logging.INFO)

C3_SERVER_ROOT = os.getenv('C3_SERVER_ROOT')
V8_INSTALL_HINT = 'Reapplying configuration by running `v8 setup` may fix this issue.'


is_macos = platform.system() == 'Darwin'
is_linux = platform.system() == 'Linux'


def fatal_error(msg):
    logger.critical(msg + ' Unable to recover from the error, exiting.')
    if not logger.isEnabledFor(logging.DEBUG):
        logger.error('Debug output may help you to fix this issue or will be useful for maintainers of this tool.'
                     ' Please try to rerun tool with `-d` flag to enable debug output')
    sys.exit(1)


def execute_os_command(command, fail_on_error=True, stdin=None):
    logger.debug('Executing command \'%s\'', command)
    process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                               stdin=subprocess.PIPE)
    if stdin is not None:
        stdin = stdin.encode()
    stdout, stderr = [stream.decode().strip() for stream in process.communicate(input=stdin)]

    logger.debug('rc    > %s', process.returncode)
    if stdout:
        logger.debug('stdout> %s', stdout)
    if stderr:
        logger.debug('stderr> %s', stderr)

    if process.returncode:
        msg = f'Failed to execute command "{command}", error:\n{stdout}{stderr}'
        if fail_on_error:
            fatal_error(msg)
        else:
            raise RuntimeError(msg)

    return stdout


def service_account_secret_name(context, namespace):
    logger.debug('Requesting service account name in contest "%s" for namespace "%s"', context, namespace)
    name = execute_os_command(f'kubectl --context {context} -n {namespace} '
                              f'get serviceaccount default -o jsonpath=\'{{.secrets[0].name}}\'')
    logger.debug('Default service account is %s', name)
    return name


def k8s_token(context, namespace, secret_account_name):
    logger.debug('Requesting auth token based on account name "%s" in contest "%s" for namespace "%s" ',
                 secret_account_name, context, namespace)
    encoded_token = execute_os_command(f'kubectl'
                                       f' --context {context}'
                                       f' -n {namespace} get secret {secret_account_name}'
                                       f' -o jsonpath=\'{{.data.token}}\'')
    logger.debug('Token collected')
    return base64.b64decode(encoded_token).decode()


def k8s_context_name():
    logger.debug('Requesting current k8s context name')
    context = execute_os_command('kubectl config current-context')
    logger.info('Found k8s context  "%s"', context)
    return context


def k8s_api_server_url(context_name):
    logger.debug('Looking for a K8s ApiServer url by context name "%s"', context_name)
    url = execute_os_command(f'kubectl config view -o'
                             f' jsonpath=\'{{.clusters[?(@.name=="{context_name}")].cluster.server}}\'')
    if not url:
        fatal_error(f'Cannot determine K8s APIServer url for context "{context_name}"')
    logger.debug('Current K8s APIServer url for context "%s" is %s', context_name, url)
    return url


def c3_cluster_url(host):
    # noinspection HttpUrlsUsage
    return f'http://{host}/c3/c3'


def configure_K8sApiServer(namespace, context):
    url = k8s_api_server_url(context)
    dsa = service_account_secret_name(context, namespace)
    token = k8s_token(context, namespace, dsa)

    c3.K8sApiServer().config().clearConfigAndSecretAllOverrides()
    c3.K8sApiServer.setApiUrlAndAuth(url, f'Bearer {token}', c3.ConfigOverride.CLUSTER)
    logger.info('C3 K8sApiServer configured!')


def ask_user(prompt):
    return input(f'{prompt} (yes/NO) ').lower() in ["yes", 'y', '1', 'ye']


def delete_namespace(context, namespace):
    if namespace == 'default':
        logger.debug('Skipping removal for the default namespace')
        return
    logger.info('Deleting namespace "%s" please wait '
                '(It may take some time to ensure all resources are cleaned)', namespace)
    try:
        execute_os_command(f'kubectl --context={context} delete ns {namespace}', fail_on_error=False)
    except BaseException as e:
        if 'Error from server (NotFound): namespaces' in str(e):
            return  # no need to report if no namespace found
        logger.warning('Failed to delete namespace. See error:\n%s', str(e))


def configure_k8s_context(namespace, context):
    # This assumes K8s context and minikube profile name are same.

    logger.debug('Configuring C3 Server to use k8s namespace "%s" in context %s', namespace, context)
    context_name = k8s_context_name()

    if context_name != context:
        logger.warning(f'K8s context configured to different context ("{context_name}") than requested '
                       f'context ("{context}").')
        if not ask_user(f'Would you like to set context to ({context})'
                        f' & namespace to ({namespace}) and proceed forward?'):
            sys.exit(1)
        # noinspection PyBroadException
        try:
            execute_os_command(f'kubectl config use-context {context}')
            logger.info('Configured successfully to Namespace (%s) and Context (%s)', namespace, context)
        except BaseException:
            fatal_error(f'No context exists with the name: "{context}"'
                        f' Run the following command to start minikube:\n'
                        f' minikube -p {context} start')


def load_c3(host):

    if getattr(builtins, 'c3', None) is not None:
        return  # already configured.

    url = f'{c3_cluster_url(host)}'

    # noinspection PyBroadException
    try:
        from urllib.request import urlopen
        src = urlopen(c3_cluster_url(host) + '/remote/c3.py').read()
        exec_scope = {}
        exec(src, exec_scope)  # pylint: disable=exec-used
        builtins.c3 = exec_scope["get_c3"](url)
    except (urllib.error.HTTPError, urllib.error.URLError, ConnectionRefusedError):
        logger.error(f'Cannot connect to c3 server on {url}\nPlease, ensure c3 server is running and try again.')
        sys.exit(1)
    except BaseException:
        logger.exception('Failed to load c3 from local server.')
        fatal_error('Please try again.')


def get_next_debug_port():

    def is_port_in_use(port_):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('localhost', port_)) == 0

    port = 7702
    while is_port_in_use(port):
        port += 1

    return port


def container_access_token(container_registry) -> str:
    """Returns access token for the given container registry"""

    az_login()
    return execute_os_command(
        f'az acr login --name {container_registry} --expose-token --output tsv --query accessToken'
    )


def imagepull_secret_name(container_registry: str) -> str:
    """Returns image pull secret name for the given container registry"""

    return f'{container_registry}-secret'


def ensure_namespace(namespace, context=None):
    context = '' if context is None else f' --context {context}'
    namespaces = json.loads(execute_os_command(f"kubectl{context} get ns -o json")).get('items')
    namespace_exists = any(n.get("metadata").get("name") == namespace for n in namespaces)

    if not namespace_exists:
        logger.debug(f"Creating namespace:${namespace}")
        execute_os_command(f'kubectl{context} create ns {namespace}')


def patch_service_account(namespace, container_registry, context=None, service_account_name='default'):
    """Patches the provided service account with the image pull secret for the given container registry"""

    imagepull_secrets = f'{{"imagePullSecrets": [{{"name": "{imagepull_secret_name(container_registry)}"}}]}}'
    execute_os_command(f"kubectl{context} -n {namespace} patch serviceaccount {service_account_name} -p '{imagepull_secrets}' --type=merge")


def configure_registry_secret(namespace, container_registry, context=None):
    ensure_namespace(namespace, context)

    logger.debug(f'Configuring image pull credentials for {container_registry}')

    # https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication?tabs=azure-cli#az-acr-login-with---expose-token
    json_credentials = {
        "auths": {
            container_registry: {
                "username": "00000000-0000-0000-0000-000000000000",
                "password": container_access_token(container_registry)
            }
        }
    }

    base64_json_encoded_credentials = base64.b64encode(json.dumps(json_credentials).encode("utf-8")).decode()

    context = '' if context is None else f' --context {context}'
    secret = f'''
cat <<EOF | kubectl{context} -n {namespace} apply -f -
apiVersion: v1
data:
  .dockerconfigjson: {base64_json_encoded_credentials}
kind: Secret
metadata:
  name: {imagepull_secret_name(container_registry)}
type: kubernetes.io/dockerconfigjson
EOF'''

    execute_os_command(secret)
    time.sleep(10)
    patch_service_account(namespace, container_registry, context)


def az_login():
    logger.info('Logging into Azure')
    # noinspection PyBroadException
    try:
        execute_os_command('az account show')
    except BaseException:
        fatal_error('Please run `az login` and try again. Run `./v8 setup` if `az` (Azure CLI) is missing')


def uninstall_helm(namespace, release, context):
    logger.info(f'Uninstalling {release} helm chart')
    try:
        execute_os_command('helm uninstall'
                           f' --namespace {namespace}'
                           f' --kube-context {context}'
                           f' {release}', fail_on_error=False)
    except BaseException as e:
        logger.warning(f'Failed to uninstall helm chart:\n{str(e)}')
