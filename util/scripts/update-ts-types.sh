#!/bin/bash

CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

. "$(dirname "$0")/helpers.sh"

checkEnvVars VAD_HOME VAD_C3_TAG

echo -e "\n${CYAN}Update @c3/types package to match currently provisioned standAloneExMachina C3 Types${NC}"
echo -e "\n${PURPLE}If this hangs, please make sure your server is running and standAloneExMachina:${VAD_C3_TAG} is provisioned${NC}"
TS_TYPES_URL=http://127.0.0.1:8080/typesys/1/standAloneExMachina/$VAD_C3_TAG/ts-types.tgz
TS_TYPES_OUT_DIR=$VAD_HOME/react/ts-types

# Pull TypeScript interfaces made from C3 Types used in standAloneExMachina
curl --user BA:BA $TS_TYPES_URL --output $TS_TYPES_OUT_DIR/standAloneExMachina.tar.gz

# Install C3 TypeScript types in relevant UI packages
echo -e "\n${PURPLE}Installing C3 TypeScript types in relevant UI packages${NC}"
cd $VAD_HOME/client && npm install file:../react/ts-types/standAloneExMachina.tar.gz --save-dev
cd $VAD_HOME/react/exMachinaClient && npm install file:../ts-types/standAloneExMachina.tar.gz --save-dev