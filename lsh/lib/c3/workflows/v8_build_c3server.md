# BUILD C3 SERVER | V8

## Steps

checkout lefv/develop

brew install direnv
hook direnv to shell
brew install yq
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20.9.0

# install conda

# Install our public GPG key to trusted store

curl https://repo.anaconda.com/pkgs/misc/gpgkeys/anaconda.asc | gpg --dearmor > conda.gpg
install -o root -g root -m 644 conda.gpg /usr/share/keyrings/conda-archive-keyring.gpg

# Check whether fingerprint is correct (will output an error message otherwise)

gpg --keyring /usr/share/keyrings/conda-archive-keyring.gpg --no-default-keyring --fingerprint 34161F5BF5EB1D4BFBBB8F0A8AEB4F8B29D82806

# Add our Debian repo

echo "deb [arch=amd64 signed-by=/usr/share/keyrings/conda-archive-keyring.gpg] https://repo.anaconda.com/pkgs/misc/debrepo/conda stable main" > /etc/apt/sources.list.d/conda.list

**NB:** If you receive a Permission denied error when trying to run the above command (because `/etc/apt/sources.list.d/conda.list` is write protected), try using the following command instead:
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/conda-archive-keyring.gpg] https://repo.anaconda.com/pkgs/misc/debrepo/conda stable main" | sudo tee -a /etc/apt/sources.list.d/conda.list

## Go to Setup Directory

`cd /Users/lefv/c3/c3wt/c3server/v8/8.3.2+357/setup`

> open makefile

.PHONY = admin_password all bootstrap env exists_ansible exists_brew galaxy_roles ide intellij vscode notification needs_sudo playbook_ide playbook_vscode playbook_site playbook_tester privileged tester $(PREREQUISITES)

PLATFORM = $(shell uname)
C3_TAP = c3-e/tools

makefile_path := $(abspath $(lastword $(MAKEFILE_LIST)))
parent_path := $(abspath $(dir $(makefile_path))/..)
C3_SERVER_ROOT ?= $(parent_path)

# Infer build tool from env variable set by direnv

BUILD := $(C3_BUILD_TOOL)

ifeq ($(shell id -u),0)
$(error Cannot run as root)
endif

ifndef BUILD
$(error BUILD variable is not set; should be set to maven for a 7.\* and gradle for a V8 build environment)
endif

NEEDS_SUDO ?= yes
ifeq ($(NEEDS_SUDO),yes)
ifeq ($(BECOME_PASSWORD),)
BECOME_PASSWORD := $(shell IFS= read -r -s -p "[ansible] password for $$(id -un $$(id -u)): " password; echo "$$password")
endif
endif

escape = $(subst ",\",$(subst \,\\,$(value $(1))))

JDKS := $(C3_TAP)/corretto8

# For a V8 (gradle) configuration we install both corretto8 and corretto17

ifeq ($(BUILD),gradle)
JDKS := $(JDKS) $(C3_TAP)/corretto17
endif

# Homebrew path to top-level directory, usually `/usr/local`

BREW_PATH = $(shell brew --prefix)

# Path to binaries (links) installed by brew

BIN_PATH = $(BREW_PATH)/bin

# Path to ansible-playbook

ANSIBLE = $(BIN_PATH)/ansible-playbook

# Path to ansible-galaxy

ANSIBLE_GALAXY = $(BIN_PATH)/ansible-galaxy

# Tools assumed to have been installed by brew

TOOLS = jq

ifeq ($(PLATFORM),Darwin)
ANSIBLE_FORMULA = ansible
TOOLS += $(ANSIBLE_FORMULA)
endif

ifeq ($(PLATFORM),Linux)
PYTHON_BIN_PATH = /usr/bin
PYTHON_PATH = $(PYTHON_BIN_PATH)/python3
ANSIBLE_EXTRA_VARS = -e "ansible_python_interpreter=$(PYTHON_PATH)"
endif

ANSIBLE_EXTRA_VARS += --extra-vars '{ "headless_macos": "$(HEADLESS_MACOS)", "builder": "$(BUILD)", "ansible_become_pass": "$(call escape $(BECOME_PASSWORD))"}'
ANSIBLE_CMD = $(ANSIBLE) -v $(ANSIBLE_EXTRA_VARS)

# Prerequisite "targets" for all required tools

PREREQUISITES := $(foreach tool,$(TOOLS),installed\_$(tool))

# Install formula (tool) using brew

installed\_% : exists*brew
@test -f $(BIN_PATH)/$* >/dev/null 2>&1 || brew install $\_ || (echo "Failed to install $\*"; exit 1)

# Implicit rule to check if a tool exists

exists\_% :
@command -v $* >/dev/null 2>&1 || (echo "$\* not found; please check README.md for a list of prerequisites"; exit 1)

all: playbook_site

ci-builder: playbook_ci-builder

# Target to run ide playbook

ide: playbook_ide

# Target to run vscode-extension playbook

c3-vsce: playbook_vscode

# intellij alias to set up ide

intellij: ide

k8s: playbook_k8s

tester: playbook_experimental

experimental: playbook_experimental

galaxy_roles: requirements.yml
$(ANSIBLE_GALAXY) install --force -r requirements.yml

playbook\_% : | bootstrap galaxy_roles chrome_configuration
@$(ANSIBLE_CMD) $\*.yml

chrome_configuration:
@$(ANSIBLE_CMD) --check chrome_settings.yml 2>&1 || (echo "Chrome settings require changes but cannot be updated while running; quit Chrome and progressive web apps and try again"; exit 8)

bootstrap: privileged notification $(PREREQUISITES) env

notification:
@echo ""
@echo "Bootstrapping configuration management tools [please be patient]..."

# Environment checks

env: exists_ansible
@test ../ -ef "$${C3_SERVER_ROOT}" || (echo "C3_SERVER_ROOT variable set incorrectly; should be $(parent_path) instead of '$$C3_SERVER_ROOT'"; exit 8)

# Lets calling programs determine if they need to supply a sudo password or not

needs_sudo:
@test "$(NEEDS_SUDO)" = "yes"

privileged: admin_password

admin_password:
ifeq ($(HEADLESS_MACOS),)
	@sudo -K; if ! echo '$(value BECOME_PASSWORD)' | sudo -S -v 2>/dev/null; then echo "Admin password invalid"; exit 3; fi
endif

> run through JAVA playbook

```
---
#
# The JDK configuration logic relies exclusively on 'java.vendor' and 'java.version' set upstream. Depending on these
# values, the configuration logic will determine the proper Java Homebrew cask, install it or upgrade it, and set facts
# that will be used by downstream stages like IntelliJ configuration setup.
#

- name: untap homebrew/cask-versions
  command: brew untap homebrew/cask-versions
  register: tap_status
  ignore_errors: yes

- name: uninstall corretto casks from homebrew/cask-versions tap
  homebrew_cask:
    name: "homebrew/cask-versions/{{ item }}"
    state: absent
    sudo_password: "{{ ansible_become_pass }}"
  when: tap_status.rc != 0
  ignore_errors: yes
  loop:
  - corretto
  - corretto8
  - corretto11

- name: re-attempt to untap homebrew/cask-versions
  command: brew untap homebrew/cask-versions
  register: tap_status
  ignore_errors: yes

- name: "Determine JDK package name for {{ java.vendor }} Java {{ java.version }}"
  set_fact:
    java_pkg_name: "corretto{{ java.major_version | trim }}"

- name: "Check for unsupported Java vendor/version combination"
  when: java_pkg_name is not defined
  fail:
    msg: "Unsupported Java vendor/version combination: {{ java.vendor }}/{{ java.version }}"

- name: "Install/Upgrade {{ java_pkg_name }} Homebrew cask"
  homebrew_cask:
    name: "{{ c3_tap }}/{{ java_pkg_name }}"
    sudo_password: "{{ ansible_become_pass }}"
  register: java_installation_result

- name: "Determine whether Java was installed or upgraded"
  set_fact:
    java_installed_or_upgraded: "{{ java_installation_result.changed | bool}}"

  # We need Java Home to generate the <jdk> element of the IntelliJ JDK table if the JDK was installed or upgraded
  # of if the <jdk> element is missing.
  # FIXME b34t23 This approach only works if ansible sets the Java distribution it installs as default
  # FIXME 44t3j2J Determine full Java version and pass it downstream

- name: list all installed JDKs
  command: "/usr/libexec/java_home -V --xml"
  become: yes
  register: jdk_installations

- name: determine JVM home path
  xml:
    xmlstring: "{{ jdk_installations.stdout | regex_replace('[\\r\\n\\t]+','') }}"
    content: text
    xpath: "/plist/array/dict/key[text()='JVMBundleID']/following::string[1][text()='com.amazon.corretto.{{ java.major_version | trim }}']/parent::dict/key[text()='JVMHomePath']/following::string[1]"
  register: jdk_matched

- name: ensure one and only one matching JDK installation exists
  assert:
    that: jdk_matched.count == 1

- name: set Java home path
  set_fact:
    java_home: "{{ jdk_matched.matches | map(attribute='string') | first }}"

- name: check that Java home directory exists
  stat:
    path: "{{ java_home }}"
  register: java_home_dir

- name: JDK installation directory must exist
  assert:
    that:
      - java_home_dir.stat.exists

- name: "Java Development Kit (JAVA_HOME)"
  debug:
    msg: "{{ java.vendor}} Java {{ java.version }} installed at {{ java_home }}"

```

---

- name: Install Rosetta 2
  command: softwareupdate --install-rosetta --agree-to-license

- name: Sub-directories in {{ local_path }}
  file:
  path: "{{ local_path }}/{{ item }}"
  state: directory
  become: yes
  loop:
  - bin
  - share

---

# Build V8

#

# Copyright 2009-2022 C3 AI (www.c3.ai). All Rights Reserved.

# This material, including without limitation any software, is the confidential trade secret and proprietary

# information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is

# strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.

# This material may be covered by one or more patents or pending patent applications.

#

name: Build Server V8

# Controls when the workflow will run

on:

# Schedules the workflow to run every 6 hours or 4 times a day

schedule: - cron: '0 _/6 _ \* \*'

# Allows you to run this workflow manually from the Actions tab

workflow_dispatch:

# A workflow run is made up of one or more jobs that can run sequentially or in parallel

jobs:

# This job spins up an EC2 action runner instance

initalize: # We are going to use ubuntu instead of macos as it is cheaper and macos is not required to run aws-cli commands
runs-on: ubuntu-latest

    # Allow following jobs to access the EC2 instance id
    outputs:
      instanceID: ${{ steps.create_instance.outputs.instanceID}}

    # Configuration for instance creation
    env:
      IMAGE_ID: ${{ secrets.AWS_AMI_ID }}
      KEY_NAME: ${{ secrets.AWS_PEM_KEY_NAME }}
      SECURITY_GROUP: ${{ secrets.AWS_SECURITY_GROUP_ID }}
      SUBNET: ${{ secrets.AWS_SUBNET }}

    steps:
    - name: Configure AWS Credentials
      uses: aws-actions/configure-aws-credentials@v1
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1

      # Attempt to start the instance and set the instance id as output for following jobs
    - name: Initalize self-hosted runner
      id: create_instance
      run: |
        INSTANCE_ID=$(aws ec2 run-instances --region us-east-1 --instance-type mac1.metal --placement Tenancy=host --image-id $IMAGE_ID --key-name $KEY_NAME --security-group-ids $SECURITY_GROUP --subnet-id $SUBNET | jq '.Instances[0] | .InstanceId')
        echo "INSTANCE_ID=$INSTANCE_ID" >> $GITHUB_ENV
        echo "::set-output name=instanceID::$INSTANCE_ID"

      # If INSTANCE_ID is empty that means aws failed to start the instance
    - name: Ensure that instance was created
      id: verify-instance
      run: |
        if [[ ${{ env.INSTANCE_ID}} == "" ]]; then exit 1; else exit 0; fi

# This job builds c3server and uploads it to an s3 bucket

build: # The build job is dependent on the initalize job
needs: initalize

    # Tell workflow to run on the macos x64 self-hosted runner
    runs-on: [self-hosted, macos, x64]

    env:
      RUN_NUMBER: ${{ github.run_number }}

    # Steps represent a sequence of tasks that will be executed as part of the job
    steps:
      - name: Install required packages
        run: |
          brew install git git-lfs openvpn

      - name: Determine c3server branch
        run: |
          if (( $RUN_NUMBER % 4 == 0 || $RUN_NUMBER % 4 == 2)); then
            echo "BRANCH_NAME=develop" >> $GITHUB_ENV
            echo "SERVER_NAME=c3server_develop" >> $GITHUB_ENV
          else
            echo "BRANCH_NAME=team/atlas" >> $GITHUB_ENV
            echo "SERVER_NAME=c3server_team_atlas" >> $GITHUB_ENV
          fi

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Install amazon correta17
        run: brew install --cask c3-e/tools/corretto17

        # Configure git lfs
      - name: Install git LFS
        run: git lfs install

      - name: Checkout c3server
        uses: actions/checkout@v2
        with:
          repository: c3-e/c3server
          path: c3/c3server
          ref: ${{ env.BRANCH_NAME }}

      - name: Setup VPN config
        run: |
          echo "${{ secrets.ACTION_RUNNER_VPN_CA_CRT }}" > ca.crt
          echo "${{ secrets.ACTION_RUNNER_VPN_SECRET_USERNAME_PASSWORD }}" > secrets.txt
          echo "${{ secrets.ACTION_RUNNER_TLS_KEY }}" > pfs.key

      - name: Connect VPN
        run: |
          export PATH=$(brew --prefix openvpn)/sbin:$PATH
          sudo openvpn --config "${{ github.workspace }}/c3/c3server/.github/vpn/c3-us-vpn-github-actions.conf" --log "vpn.log" --daemon

      # Workaround to force DNS on active VPN connection, MacOS does not use /etc/resolv.conf
      # Finds the active ip table iterface to determine device for outgoing connection.
      # Matches the interface to the list of network services and parses the hardware port name.
      # Sets the DNS server to point to google DNS using active network hardware port.
      - name: Add Google DNS to DNS Configuration
        run: |
          export ACTIVE_INTERFACE=$(route -n get default | grep interface | awk '{print $2}') && ACTIVE_NETWORK_SERVICE=$(networksetup -listnetworkserviceorder | grep -B 1 "$ACTIVE_INTERFACE" | head -n 1 | awk '/\([0-9]+\)/{ print }'|cut -d " " -f2-) && networksetup -setdnsservers "$ACTIVE_NETWORK_SERVICE" 8.8.8.8

      - name: Test VPN connection
        run:
          echo $(curl -sS -I https://ci-artifacts.c3.ai)

      - name: Set Environment Variables
        run: |
          echo "TERM=xterm-256color" >> $GITHUB_ENV
          echo "C3_ENV=dev" >> $GITHUB_ENV
          echo "COLUMNS=80" >> $GITHUB_ENV
          echo "LINES=24" >> $GITHUB_ENV
          echo "PATH=$PATH:/usr/local/share/c3/v8/conda/anaconda/bin/" >> $GITHUB_ENV

      - name: Run c3server v8 setup
        id: c3-v8-setup
        run: |
          cd ${{ github.workspace }}/c3/c3server
          export HEADLESS_MACOS=1 && echo ${{ secrets.EC2_INSTANCE_PASS }} | ./v8 setup
        continue-on-error: true

      - name: Output v8 setup error logs
        if: steps.c3-v8-setup.outcome == 'failure'
        run: |
          tail -n +1 /tmp/ansible-log-*
          exit 1

      - name: Build c3server
        id: c3-v8-build
        if: steps.c3-v8-codegen-validate.outcome != 'failure'
        run: |
          cd ${{ github.workspace }}/c3/c3server
          source ~/.zshrc
          direnv allow . && eval "$(direnv export zsh)"
          v8 rebuild
        shell: zsh {0}

      # TODO: PLAT-48752 - Re-enable code-gen -V
      # - name: Code-gen validate c3server packages
      #   id: c3-v8-codegen-validate
      #   if: steps.c3-v8-install.outcome != 'failure'
      #   run: |
      #     cd ${{ github.workspace }}/c3/c3server
      #     source ~/.zshrc
      #     direnv allow . && eval "$(direnv export zsh)"
      #     v8 code-gen -V
      #   shell: zsh {0}

      - name: Start c3server
        id: c3-v8-start
        if: steps.c3-v8-build.outcome != 'failure'
        run: |
          cd ${{ github.workspace }}/c3/c3server
          source ~/.zshrc
          direnv allow . && eval "$(direnv export zsh)"
          v8 start
        shell: zsh {0}

      - name: Test for c3server ready on port 8888
        id: c3-v8-server-ready
        if: steps.c3-v8-start.outcome != 'failure'
        uses: nick-fields/retry@v2
        with:
          command: cd ${{ github.workspace }}/c3/c3server && sh .github/scripts/checkC3ServerReady.sh
          timeout_seconds: 20
          retry_wait_seconds: 10
          max_attempts: 40

      - name:  Compress server directory
        id: comp-dir
        run: |
          cd ${{ github.workspace }}/c3
          zip -r ${{ env.SERVER_NAME }}.zip c3server

      - name: Add to s3 bucket
        id: add-to-s3
        run: |
          cd ${{ github.workspace }}/c3
          aws s3 cp ${{ env.SERVER_NAME }}.zip s3://c3-github-action-runner-servers

        # Trigger repository_dispatch to trigger test-vsce workflow
      - name: Trigger testing workflow
        id: trigger-test-vsce
        if: steps.add-to-s3.outcome != 'failure'
        run: |
          curl \
            -X POST \
            -H "Accept: application/vnd.github+json" \
            -H "Authorization: Bearer ${{ secrets.C3_GITHUB_PAT }}" \
            https://api.github.com/repos/c3-e/c3vsce/dispatches \
            -d '{"event_type":"build-server-v8-complete", "client_payload": { "server": "${{ env.SERVER_NAME}}", "branch": "${{ env.BRANCH_NAME}}" }}'

      - name: Kill VPN connection
        if: always()
        run: |
          sudo chmod 777 vpn.log
          sudo killall openvpn

      - name: VPN logs
        uses: actions/upload-artifact@v2
        if: always()
        with:
          name: VPN logs
          path: vpn.log

teardown: # We are going to use ubuntu instead of macos as it is cheaper and macos is not required to run aws-cli commands
runs-on: ubuntu-latest # This run is dependent on the initalize and build jobs
needs: [initalize, build] # We still want to tear down the instance even if the build fails
if: always() || (needs.build.result == 'failure')

    # Need instance id from the initalize job
    env:
      INSTANCE_ID: ${{needs.initalize.outputs.instanceID}}

    steps:
    - name: Configure AWS Credentials
      uses: aws-actions/configure-aws-credentials@v1
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1

      # Run AWS CLI command to terminate instance and parse TerminatingInstances.CurrentState.Code
    - name: Terminate runner instance
      id: terminate_instance
      run: |
        echo "TERM_CODE=$(aws ec2 terminate-instances --instance-ids ${{ env.INSTANCE_ID}} | jq .'TerminatingInstances[0].CurrentState.Code')" >> $GITHUB_ENV

      # Code 32 means instance is in shutting down state
    - name: Verify termination
      id: verify-termination
      run: |
        if [[ "$TERM_CODE" == "32" ]]; then exit 0; else exit 1; fi

---

## SETUP SCRIPT

### Setup Env

```bash
#shellcheck shell=bash

set -eE # same as: `set -o errexit -o errtrace`

print_in_color() {
  local color="$1"
  shift
  if [[ -z ${NO_COLOR+x} ]]; then
    printf "$color%b\e[0m\n" "$*"
  else
    printf "%b\n" "$*"
  fi
}

red_bold() { print_in_color "\e[1;31m" "$*"; }
magenta_bold() { print_in_color "\e[1;35m" "$*"; }

function error_recovery() {
    red_bold "Error loading environment. Run 'v8 setup && direnv reload' to try again."
}

trap error_recovery ERR

C3_SERVER_ROOT="$(expand_path .)"
export C3_SERVER_ROOT
PATH_add "${C3_SERVER_ROOT}"
PATH_add scripts
PATH_add infra/bin

# check if we're running on macOS
function is_macOS() {
    [ "$(uname)" = "Darwin" ]
}

# determine whether or not we are in a git repo
is_git_repo() {
    git rev-parse --git-dir > /dev/null 2>&1
}

# path to root of git worktree
git_worktree_root() {
    git rev-parse --show-toplevel
}

if is_git_repo; then
    C3_BUILD_TOOL=gradle

    # Env var to ensure a V8 (gradle) based configurations
    export C3_BUILD_TOOL

    # Set env vars required for use_node function
    # https://github.com/direnv/direnv/blob/729fbecd96f3e827575f19497bc01df33395d679/stdlib.sh#L1054
    NODE_VERSION_PREFIX="v"
    NODE_VERSIONS="$HOME/.nvm/versions/node"
    source_env_if_exists "scripts/workspace"
fi

```

```bash
#!/bin/bash

# BUILD C3 SERVER | V8

# Go to Setup Directory
cd /Users/lefv/c3/c3wt/c3server/v8/8.3.2+357/setup

# Open makefile
# Assuming this means to display the contents of the makefile
cat Makefile

# Run through JAVA playbook
# Here we translate the Ansible playbook logic to Bash commands
brew untap homebrew/cask-versions

brew uninstall --cask corretto
brew uninstall --cask corretto8
brew uninstall --cask corretto11

brew untap homebrew/cask-versions

# Determine JDK package name for given Java vendor/version
java_vendor="corretto"
java_version="17"
java_pkg_name="corretto${java_version}"

# Check for unsupported Java vendor/version combination
if [ -z "$java_pkg_name" ]; then
  echo "Unsupported Java vendor/version combination: $java_vendor/$java_version"
  exit 1
fi

# Install/Upgrade Java Homebrew cask
brew install --cask $java_pkg_name

# Determine JVM home path
jdk_installations=$(sudo /usr/libexec/java_home -V --xml)
jdk_home_path=$(echo "$jdk_installations" | xmllint --xpath "/plist/array/dict/key[text()='JVMBundleID']/following::string[1][text()='com.amazon.corretto.${java_version}']/parent::dict/key[text()='JVMHomePath']/following::string[1]/text()" -)

if [ -z "$jdk_home_path" ]; then
  echo "Error: Could not determine Java home path"
  exit 1
fi

if [ ! -d "$jdk_home_path" ]; then
  echo "Error: Java home directory does not exist"
  exit 1
fi

echo "$java_vendor Java $java_version installed at $jdk_home_path"

# Install Rosetta 2
sudo softwareupdate --install-rosetta --agree-to-license

# Create sub-directories
local_path="/desired/local/path" # Replace with actual path
sudo mkdir -p "${local_path}/bin"
sudo mkdir -p "${local_path}/share"

# Build V8
# Assuming additional steps required to build V8
# Placeholder for actual build steps
echo "Building V8 server..."

# Additional steps would follow here based on the provided notes

```
