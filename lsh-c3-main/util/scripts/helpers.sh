#!/bin/bash

# Import this file in scripts using `. "$(dirname "$0")/helpers.sh"`, then call the desired function

CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

checkEnvVars() {
  for arg
  do
    checkEnvVar $arg
  done
}

checkEnvVar() {
  evar=$1
  if [ -z ${!evar} ]; then
    echo "$evar must be set. Please check your environment variables and try again."
    exit -1
  fi
}
