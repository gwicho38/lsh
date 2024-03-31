#!/bin/bash
export U_NAME="elastic"
export API_KEY="SW0T4ZPQEGtEupiu50kpA"
export U_PSWD="dSu9sJxt7YNm3iy9OyWCWcdr"
export ES_URL='https://ef5820953fd043b98fd9568dc18fbe57.us-east-1.aws.found.io:443'
echo $API_KEY
echo $ES_URL
curl -X GET $ES_URL -u "$U_NAME:$U_PSWD"
