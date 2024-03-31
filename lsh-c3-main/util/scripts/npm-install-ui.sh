#!/bin/bash

if [ -f ~/.exmachina_profile_dev ]; then
  . ~/.exmachina_profile_dev;
fi

PURPLE='\033[0;35m'
NC='\033[0m' # No Color
ROOT='../../'

# Runs `npm install` in all relevant UI packages
echo -e "\n${PURPLE}Running npm install and compile in infra${NC}"
npm --prefix "${ROOT}react/infra" install
npm --prefix "${ROOT}react/infra" run compile
npm config set '@fortawesome:registry' https://npm.fontawesome.com/
npm config set '//npm.fontawesome.com/:_authToken' 61CD54F8-2AF6-4843-841C-B6C0B1B243D5
npm --prefix "${ROOT}react/uiCommon" install file:${ROOT}react//infra/dist --save-dev
npm --prefix "${ROOT}react/exMachinaClient" install file:${ROOT}react//infra/dist --save-dev

echo -e "\n${PURPLE}Running npm install in uiCommon${NC}"
npm --prefix "${ROOT}react/uiCommon" install

echo -e "\n${PURPLE}Running npm install in client${NC}"
npm --prefix "${ROOT}client" install

echo -e "\n${PURPLE}Running npm install in exMachinaClient${NC}"
npm --prefix "${ROOT}react/exMachinaClient" install
