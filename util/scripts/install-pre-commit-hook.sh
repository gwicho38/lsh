#!/bin/bash

. "$(dirname "$0")/helpers.sh"

if [ -f ~/.exmachina_profile_dev ]; then
  . ~/.exmachina_profile_dev;
fi

checkEnvVar VAD_HOME

# install binaries
unameOut="$(uname -s)"
case "${unameOut}" in
    Darwin*)
      echo "Installing scalariform ..."
      brew install scalariform;;
    Linux* | *)
      "For ${unameOut} system check install guide https://github.com/scala-ide/scalariform"
esac

DIR=$VAD_HOME
cp -p ${DIR}/config/pre-commit ${DIR}/.git/hooks/

echo "Your precommit hook was successfully set up"
