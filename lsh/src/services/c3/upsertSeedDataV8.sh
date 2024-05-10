#!/bin/bash

fileRegex=$1
url="http://localhost:8888/$env/$pkg/api/8/<typeName>/mergeBatch"

HELP="\npopulateUI - a utility for batch ingesting persistable data to the C3 AI Platform using cURL\n
This utility checks the current working directory for a folder named 'data', and
posts every file matching the fileRegex to the mergeBatch API for the relevant Type.\n
Folder structure:
  └── <anyFolder>
    ├── scripts
    │   └──populateUI.sh
    └── data
        ├── SmartBulb
        │   └── nameMeAnything.jsonc
        ├── SmartBulbFixture
        │   └── nameMeAnything.json
        └── MyType
            └── nameMeAnything.txt

Folder structure:
  └── <package>
    ├── scripts
    │   └──populateUI.sh
    └── seed
        ├── SmartBulb
        │   └── nameMeAnything.jsonc
        ├── SmartBulbFixture
        │   └── nameMeAnything.json
        └── MyType
            └── nameMeAnything.txt

  Where the directory name is the name of the Type that will accept that folder's respective data. (e.g. SmartBulb)\n

Usage:
  bash populateUI.sh <fileRegex> [authToken] [flags]\n
  Examples: bash populateUI.sh \"*.json\" 

Arguments:
  <fileRegex> - required
    A pattern against which to match filenames.  Currently, this utility can
    only ingest JSON data in a .json, .jsonc, or .txt file.
    \e[4m--all\e[0m or \e[4m\"*\"\e[0m will match all filetypes.
    \e[4m\"*.json\"\e[0m will match all .json files, etc.\n
  [authToken]
    No longer needed as URL is pointing to localhost.
    Required if <URL> begins with https. This is the user's authorization token
    obtained from Chrome Developer Tools in the C3 Console via:
    Authenticator.generateActionAuthToken()"

flags=""
pwd=$PWD

# Simple error checking - lets get that out of the way
if [ "$#" = 0 ] || [ "$1" = "--help" ]; then
  printf "$HELP"
  exit 1
fi

# Check to see which arguments contain flags
if [ "$#" = 2 ] && [[ "$2" =~ ^-[A-z]* ]]; then
  # No auth token needed - check param #2 for flags
  flags=$2
elif [ "$#" = 3 ] && [[ "$3" =~ ^-[A-z]* ]]; then
  # Auth token was specified - check param #3 for flags
  flags=$3
fi

# Capture the file regex
if [ "$fileRegex" = "--all" ] || [ "$fileRegex" = "*" ]; then
  fileRegex="*.*"
fi

# Check for the presence of the top-level data folder then continue with data loading
if [ -d "../data" ]; then
  postedFiles=()
  failedFiles=()
  totalFileSize=$(find ../data/ -maxdepth 4 -type f -name "${fileRegex}" -exec du -c {} + | grep total$ | cut -f1 | python3 -c "import sys; print(sum(int(l) for l in sys.stdin))")

  currentProcessedSize=0
  dataFolders=$(find .. -type d | grep "^../data/\(.*\)$")

  if [[ ! -z "$dataFolders" ]]; then
    echo -e '\n\n' "Looking in the following directories for files to upload:\n${dataFolders[@]}"
  for directory in $dataFolders; do
    printf '\n\n***************************\n'
    printf "Directory: ${directory}\n"

    cd "$directory"
    typeName=$(echo $directory | cut -d'/' -f3)
    echo "in directory $directory"
    fileCount=$(find ./ -maxdepth 1 -type f -name "${fileRegex}" -print0 | tr -d -c '\0' | wc -c)

    printf "Found \e[1m${fileCount}\e[0m files matching regex ${fileRegex}\n"

    if [ $fileCount -ne 0 ]; then

      for filename in $fileRegex; do

        extension="${filename##*.}"
        case $extension in
        "json")
            contentType="-HContent-Type: application/json"
            ;;
        "jsonc")
            contentType="-HContent-Type: application/json"
            ;;
        "txt") # text documents must contain json data
            contentType="-HContent-Type: application/json"
            ;;
        *)
          printf "Unknown file extension ${extension} for file ${filename}. Skipping\n"
          continue
          ;;
        esac

        printf -v filename_esc "%q" "${filename}"

        filenamenospace=${filename//[[:blank:]]/}
              # Create the url to post to by combining the type name and the file name
        urlNew="${url}/$(echo $typeName | sed 's|^\./||')?action=mergeBatch"

        printf '%s\n' "-------------"
        printf "cURL: Posting \e[1m${filename}\e[0m\n"
        printf "      to URL: ${urlNew}\n"

        case $url in
        "https://"*)
          args=("${contentType}" "-HConnection: close" ${ssl} "-X" "POST" "-w" "%{http_code}" "--data-raw" "$(generate_post_data ${filename})" "${urlNew}")
          ;;
        "http://"*)
          args=("${contentType}" "-HConnection: close" "-X" "POST" "-w" "%{http_code}" "--data-raw" "$(generate_post_data ${filename})" "${urlNew}")
          ;;
        esac

        response=$(curl "${args[@]}" -o /dev/null | tail -n1)

        if [ $response -ne "200" ]; then
          failedFiles+=("$typeName/$filenamenospace")
          if [ $(du -s $filename | awk '{print $1}') != ' ' ]; then
            currentProcessedSize=$(($currentProcessedSize + $(du -s $filename | awk '{print $1}')))
          fi

          printf "cURL: HTTP Code ${response}\n"
          printf "cURL: \e[31;1mError\e[0m posting file ${directory}/${filename}\n"
          printf "$(date) cURL: HTTP Code ${response} for file ${directory}/${filename}\n" >>"$pwd/curl_output.txt"
          echo -e "curl $(printf "'%s' " "${args[@]}" | sed -e "s/'\([^' ]*\)'/\1/g")\n" >>"$pwd/curl_output.txt"
        else
          postedFiles+=("$typeName/$filenamenospace")
          if [[ $(du -s $filename | awk '{print $1}') = *[!\ ]* ]]; then
            currentProcessedSize=$(($currentProcessedSize + $(du -s $filename | awk '{print $1}')))
          fi

          printf "cURL: HTTP Code ${response}\n"
          printf "cURL: File posted \e[1msuccessfully\e[0m\n"
          printf "$(date) cURL: HTTP Code ${response} for file ${directory}/${filename}\n" >>"$pwd/curl_output.txt"
          echo "curl $(printf "'%s' " "${args[@]}" | sed -e "s/'\([^' ]*\)'/\1/g")" >>"$pwd/curl_output.txt"
        fi

        # Calculate how much of the payload has been processed
        currentProgress=$(echo "scale=2 ; (($currentProcessedSize / $totalFileSize)) * 100" | bc)%

        # Output the progress bar
        printf "\n%s\n" "========== PROGRESS: ${currentProgress} completed =========="

        sleep 1
      done
    fi

    cd "$pwd"
    done
  else
    printf "Invalid directory structure\n $HELP"
  fi

  if [ ${#postedFiles[@]} -ne 0 ]; then
    printf '\n%s\n' "Succesfully posted the following files: ${postedFiles[@]}"
  fi

  if [ ${#failedFiles[@]} -ne 0 ]; then
    printf '%s\n' "The following files failed to upload: ${failedFiles[@]}"
  fi
# Otherwise, display the proper directory structure
else
  printf "$HELP"
  exit 1
fi
