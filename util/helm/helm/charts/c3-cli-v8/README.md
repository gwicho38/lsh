# C3-Cli-V8 Helm Chart

[Up](../../README.md)

## Overview

`c3-cli-v8` chart consists of a dedicated pod to enable execution of JS code in a V8 server. This provides an alternative to run JS code from CLI instead of UI console. The pod will pull a npm module (c3-remote) from V8 server which is assumed to be deployed in the same Kubernetes namespace.

## How to run JS code in V8 server?

##### Run JS code in CLI

```
NAMESPACE="pb"
CLI_POD="c3-cli-v8-c3cli-6ff9b6649c-cr2vx"
LEADER_SERVICE="leader"
URL="http://${LEADER_SERVICE}.${NAMESPACE}:8888"

CONNECT_C3="require('@c3/remote'); C3.connect('${URL}').typeSystem().importTypes(global);"
JS_EXPRESSION="console.log(Env.nodes()[0].state);"

# exec multi-line JS code in cli pod
kubectl -n ${NAMESPACE} exec ${CLI_POD} -- bash -c "node --no-warnings -e \" ${CONNECT_C3} ${JS_EXPRESSION} \" "

```

##### Run JS code from a file

Create a JS script.
```
cat << EOF > /tmp/script.js
var myArgs = process.argv.slice(2)
remoteUrl = myArgs[0]
require("@c3/remote");
C3.connect(remoteUrl).typeSystem().importTypes(global);
console.log(Env.nodes()[0].state)
EOF
```

Copy script into pod and execute it.
```
# copy the script to pod
kubectl -n ${NAMESPACE} cp /tmp/script.js ${CLI_POD}:/tmp/script.js
# execute js script from a file 
kubectl -n ${NAMESPACE} exec ${CLI_POD} -it -- node /tmp/script.js ${URL}

```
