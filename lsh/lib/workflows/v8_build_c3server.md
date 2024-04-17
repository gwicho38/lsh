# BUILD C3 SERVER | V8

## Go to Setup Directory 

`cd /Users/lefv/c3/c3wt/c3server/v8/8.3.2+357/setup`

> open makefile

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
  schedule:
    - cron:  '0 */6 * * *'

  # Allows you to run this workflow manually from the Actions tab
  workflow_dispatch:

# A workflow run is made up of one or more jobs that can run sequentially or in parallel
jobs:

  # This job spins up an EC2 action runner instance 
  initalize:
    # We are going to use ubuntu instead of macos as it is cheaper and macos is not required to run aws-cli commands
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
  build:
    # The build job is dependent on the initalize job
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

  teardown:
    # We are going to use ubuntu instead of macos as it is cheaper and macos is not required to run aws-cli commands
    runs-on: ubuntu-latest
    # This run is dependent on the initalize and build jobs
    needs: [initalize, build]
    # We still want to tear down the instance even if the build fails
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

