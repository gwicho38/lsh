#!/usr/bin/env python3

# Copyright 2009-2022 C3 AI (www.c3.ai). All Rights Reserved.
# This material, including without limitation any software, is the confidential trade secret and proprietary
# information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
# strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
# This material may be covered by one or more patents or pending patent applications.

import logging
import os

from subjects import minikube
from utils_local_setup import configure_registry_secret, c3_cluster_url, fatal_error, \
    configure_K8sApiServer, imagepull_secret_name, load_c3
from utils_python_cli_framework import cli

k8s_local = cli.subject(
    name='k8s-local',
    help='Prepares k8s cluster for running CloudServices from c3server on local JVM',
    description='''
C3 helper for preparing local k8s environment for running CloudServices for a locally running c3 server.

C3 server should be started before running this script.

This script will start `dev` minikube profile (if not started) and configure c3 server to use it for
running CloudService.
'''
)

logger = logging.getLogger()

NAMESPACE = 'local'
RELEASE_NAME_LOCAL = f"c3-{NAMESPACE}"
CONTAINER_REGISTRY = 'aksdevc3.azurecr.io'
HELM_CHART_REGISTRY = 'ci-artifacts.c3.ai'
HOST_NAME = f'c3.{NAMESPACE}.test'
PROFILE = 'dev'
C3_DIR = os.getenv('C3_DIR')

if C3_DIR is None:
    fatal_error('C3_DIR environment variable is not set')


def jupyterhub_config():
    """Set JupyterHub config for local k8s cluster"""

    jupyter_service_prefix = 'k8sjup-cs-001'
    jupyterhub_config = {
        "jupyterSingleUserStartTimeout": 900,
        "imagePullSecrets": [imagepull_secret_name(CONTAINER_REGISTRY)],
    }

    for path, value in jupyterhub_config.items():
        c3.JupyterHub_Config.setConfigOrSecretValue(jupyter_service_prefix, path, value, c3.ConfigOverride.CLUSTER)


@k8s_local.command()
def configure():
    """Configure k8s cluster and c3server for running cloud services"""

    load_c3('localhost:8888')
    minikube.start(PROFILE)

    configure_registry_secret(NAMESPACE, CONTAINER_REGISTRY, PROFILE)
    configure_K8sApiServer(NAMESPACE, PROFILE)
    c3.AppUrl.make({"id": HOST_NAME}).setConfig(c3.ConfigOverride.CLUSTER)

    jupyterhub_config()

    c3.C3.env().setConfigValue('configuredCloudNamespace', NAMESPACE, c3.ConfigOverride.CLUSTER)

    logger.log(logging.INFO + 1, 'C3 Server configured and ready for use')
    logger.log(logging.INFO + 1, f'Url: {c3_cluster_url(HOST_NAME)}/static/console')
    logger.info('Happy coding!')
