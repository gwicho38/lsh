#!/usr/bin/env python3

# Copyright 2009-2022 C3 AI (www.c3.ai). All Rights Reserved.
# This material, including without limitation any software, is the confidential trade secret and proprietary
# information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
# strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
# This material may be covered by one or more patents or pending patent applications.

import json
import logging
import os

import sys
import time

from utils_local_setup import execute_os_command, fatal_error, ask_user, is_macos, V8_INSTALL_HINT

logger = logging.getLogger()


# def stop(profile):
#     """Stop specified minikube profile"""
#     logger.info(f'Stopping minikube with profile "{profile}".')
#     try:
#         execute_os_command(f'minikube -p {profile} stop', fail_on_error=False)
#     except BaseException as e:
#         logger.warning(f'Failed to stop minikube. Error for more details:\n{str(e)}')


# def start(profile):
#     """
#     Starts and apply general configuration for minikube

#     Dependency:
#     minikube
#     |- check profile
#     |- start minikube vm
#     |- configure traffic to vpn (macos)
#     |- set env in process to use started docker server
#     |- check addons, configure metallb addon (ip ranges)
#     |- open firewall (on linux) to allow VM -> host communication
#     """
#     prepare_minikube_profile(profile)
#     minikube_vpn_helper()
#     set_docker_env(profile)


# def list_minikube_profiles():
#     logger.debug('Listing existing minikube profiles')
#     return json.loads(execute_os_command('minikube profile list -o json')).get('valid')


# def list_running_profiles_by_name():
#     profiles = list_minikube_profiles()

#     return [p.get('Name') for p in profiles if p['Status'] == 'Running']


# def prepare_minikube_profile(requested_profile_name):
#     profiles = list_minikube_profiles()
#     profiles_by_names = {profile.get('Name'): profile for profile in profiles}

#     if requested_profile_name not in profiles_by_names:
#         fatal_error(f'Cannot use profile "{requested_profile_name}" as it not a valid profile.'
#                     f' See `minikube profile list`. {V8_INSTALL_HINT}')

#     profile = profiles_by_names[requested_profile_name]

#     if profile.get('Status') == 'Running':
#         logger.info(f'Minikube profile "{requested_profile_name}" already running')
#         return

#     running_profiles = [p.get('Name') for p in profiles if p['Status'] == 'Running']
#     if running_profiles:
#         prof_name = '"' + ('", "'.join(running_profiles)) + '"'
#         logger.warning(f'Minikube profile(s) {prof_name} are already running.'
#                        ' It\'s not recommended to have more that one profile running in the same time.'
#                        ' We suggest to either stop running profiles using command `minikube -p <profile> stop`'
#                        ' or rerun current command specifying target profile using `-p <profile>`.')
#         if not ask_user(f'Do you want to continue with starting profile "{requested_profile_name}" anyway?'):
#             logger.info('Terminating')
#             sys.exit(0)

#     logger.info(f'Starting minikube with profile "{requested_profile_name}". This may take a while.')
#     execute_os_command(f'minikube -p {requested_profile_name} start')
#     time.sleep(5)


# def minikube_vpn_helper():
#     if is_macos:
#         logger.debug('Triggering minikube helper to correct issues with routing traffic from minikube to vpn on macos')
#         # By triggering this helper we ensure that docker containers will have internet access even if VPN is on.
#         # Internally it will correct NAT and routing tables. Required only on macos.
#         execute_os_command('/usr/local/sbin/minikube-vpn-helper')


# def set_docker_env(profile):
#     logger.debug(f'Setting docker environment for minikube profile {profile}')
#     docker_envs = execute_os_command(f'minikube -p {profile} docker-env')

#     for env in docker_envs.split("\n"):
#         if "export" in env:
#             var, value = env.split(" ")[1].split("=")
#             os.environ[var] = value.replace("\"", "")
#             logger.debug("Env set %s=%s", var, os.environ.get(var))
