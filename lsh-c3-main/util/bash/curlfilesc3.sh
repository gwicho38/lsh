#!/usr/bin/env bash

fileRegex=$1
url=$2

HELP="curlAll - a utility for batch ingesting data to the C3.ai Platform using cURL\n
This utility checks the current working directory for a folder named 'data', and
posts every file matching the fileRegex to an inbox in the environment named <CanonicalName>/<Filename>.\n
Folder structure:
  └── <demoDataFolder>
       └── data
            ├── Canonical*
            |    └── inbox
            |         └── <fileName>.[csv || gz || tsv || zip || txt]
            ├── Canonical*
            |    └── inbox
            |         └── <fileName>.[csv || gz || tsv || zip || txt]
            └── ...
  Where Canonical* is the name of the canonical that will accept that folder's respective <fileName>. (ie. CanonicalWorkOrder, CanonicalFactory, etc.)\n

Usage:
  curlAll <fileRegex> <URL> [authToken] [flags]\n
  Examples: curlAll \"*.csv\" http://localhost:8080/import/1/c3EnergyManagement/prod \"\" -qt
            curlAll \"*.gz\" https://somedomainintexasorsomething.com/import/1/c3SpiciestMeatballSimulator/prod \"somelongdrawnoutauthkey\" -rq
Arguments:
  <fileRegex> - required
    A pattern against which to match filenames.
    \e[4m--all\e[0m or \e[4m\"*\"\e[0m will match all filetypes.
    \e[4m\"*.csv\"\e[0m will match all .csv files, etc.\n
  <URL> - required
    The target URL to which to curl. Examples:
    \e[4mhttp://localhost:8080/import/1/tenant/tag\e[0m
    \e[4mhttps://lightbulb-demo.c3-e.com/import/1/tenant/tag\e[0m\n
  [authToken]
    Required if <URL> begins with https. This is the user's authorization token
    obtained from Chrome Developer Tools in the C3 Console.,
  [flags]
    q: quiet, does not show the status of each file being loaded, just the overall status of the load
    t: track, tracks which files have been sucessfully loaded by moving them into the 'loaded' directory
    o: old, load data in the old format (no $(data/) folder, just <demoDataFolder>/Canoncical*/inbox/{data})
    r: reload, reloads all data files - including those that have been moved to the \e[4mloaded\\e[0m subdirectory.\n"

loaded_dir="loaded/"
flags=""
pwd=$PWD

# Simple error checking - lets get that out of the way
if [ "$#" = 0 ] || [ "$1" = "--help" ] || [ "$#" -lt 3 ] && [[ ! "$url" =~ http://* ]]; then
	printf "$HELP"
	exit 1
fi

# Check to see if auth token is required - if it is and there is no auth token, exit
if [[ "$url" =~ https.* ]] && [[ "$3" =~ -.* ]]; then
	printf "$HELP"
	exit 1
elif [[ "$url" =~ https.* ]] && [[ ! -z $url ]]; then
	authToken="$3"
fi

QUIET=0
TRACK=0
LOCAL=0
OLD=0
RELOAD=0

# Check to see which arguments contain flags
if [ "$#" = 3 ] && [[ "$3" =~ ^-[A-z]* ]]; then
	# No auth token needed - check param #3 for flags
	flags=$3
elif [ "$#" = 4 ] && [[ "$4" =~ ^-[A-z]* ]]; then
	# Auth token was specified - check param #4 for flags
	flags=$4
fi

# Pluck the individual flags out of the flags string
if [[ $flags == *"q"* ]]; then
	QUIET=1
fi
if [[ $flags == *"r"* ]]; then
	RELOAD=1
fi
if [[ $flags == *"t"* ]]; then
	TRACK=1
fi
if [[ $flags == *"l"* ]]; then
	LOCAL=1
fi
if [[ $flags == *"o"* ]]; then
	OLD=1
fi

# Capture the file regex
if [ "$fileRegex" = "--all" ] || [ "$fileRegex" = "*" ]; then
	fileRegex="*.*"
fi

case $url in
"https://"*)
	authHeader="-HAuthorization: ${authToken}"
	ssl="--ssl"
	;;
"http://"*) credentials="-u BA:BA" ;;
*)
	printf "URL not recognized: $url\n"
	exit 1
	;;
esac

# Check for the presence of the top-level data folder then continue with data loading (unless we are using the old format)
if [ $OLD = 1 ] || [ -d "data" ]; then
	postedFiles=()
	failedFiles=()

	if [ $OLD != 1 ]; then
		totalFileSize=$(find ./data/ -maxdepth 4 -type f -name "${fileRegex}" -exec du -c {} + | grep total$ | cut -f1 | python -c "import sys; print(sum(int(l) for l in sys.stdin))")
	else
		totalFileSize=$(find ./ -maxdepth 4 -type f -name "${fileRegex}" -exec du -c {} + | grep total$ | cut -f1 | python -c "import sys; print(sum(int(l) for l in sys.stdin))")
	fi

	currentProcessedSize=0

	if [ $OLD != 1 ]; then
		inboxes=$(find . -type d | grep "^./data/\(.*\)/inbox$")
	else
		inboxes=$(find . -type d | grep "^./\(.*\)$")
	fi

	if [[ ! -z "$inboxes" ]]; then
		printf '\n%s\n' "Looking in the following directories for files to upload: ${inboxes[@]}"
		for directory in $inboxes; do

			if [ $QUIET != 1 ]; then
				printf '\n\n***************************\n'
				printf "Directory: ${directory}\n"
			fi

			if [ $RELOAD = 1 ]; then
				for loaded in $(ls -d ${directory}/${loaded_dir}); do
					fileCount=$(find ${loaded} -maxdepth 1 -type f -name "${fileRegex}" -print0 | tr -d -c '\0' | wc -c)
					if [ $fileCount -ne 0 ]; then
						find ${loaded} -maxdepth 1 -type f -name "${fileRegex}" -exec sh -c "mv \"{}\" ${loaded}../" \;

						if [ $QUIET != 1 ]; then
							printf "Moved \e[1m${fileCount}\e[0m files matching regex $fileRegex in $loaded up one level\n"
						fi
					else
						if [ $QUIET != 1 ]; then
							printf "No files matching regex $fileRegex in $loaded\n"
						fi
					fi
				done
			fi

			cd "$directory"

			if [ $QUIET != 1 ] && [ ! -d ${loaded_dir} ] && [[ $PWD != *"/loaded" ]]; then
				mkdir -p ${loaded_dir}
			fi

			# Split the directory string (ie. ./data/CanonicalSomething/inbox) by the '/' character and grab the Canonical name (CanonicalSomething)
			if [ $OLD != 1 ]; then
				canonicalName=$(echo $directory | cut -d'/' -f3)
			else
				canonicalName=$(echo $directory | cut -d'/' -f2)
			fi

			fileCount=$(find ./ -maxdepth 1 -type f -name "${fileRegex}" -print0 | tr -d -c '\0' | wc -c)

			if [ $QUIET != 1 ]; then
				printf "Found \e[1m${fileCount}\e[0m files matching regex ${fileRegex}\n"
			fi

			if [ $fileCount -ne 0 ]; then
				for filename in $fileRegex; do
					extension="${filename##*.}"
					contentType="-HContent-Type: text/csv"
					case $extension in
					"gz") contentEncoding="-HContent-Encoding: gzip" ;;
					"zip") contentEncoding="-HContent-Encoding: gzip" ;;
					"csv") contentEncoding="-HContent-Encoding: identity" ;;
					"pdf") contentEncoding="-HContent-Encoding: application/pdf" ;;
					"html") contentEncoding="-HContent-Encoding: identity" ;;
					"jpeg") contentEncoding="-HContent-Encoding: image/jpeg" ;;
					"gif") contentEncoding="-HContent-Encoding: image/gif" ;;
					"json")
						contentEncoding="-HContent-Encoding: identity"
						contentType="-HContent-Type: application/json"
						;;
					"txt") contentEncoding="-HContent-Encoding: identity" ;;
					"tsv") contentEncoding="-HContent-Encoding: identity" ;;
					"parquet")
						contentEncoding="-HContent-Encoding: snappy"
						contentType="-HContent-Type: application/vnd.apache.parquet+binary"
						;;
					*)
						printf "Unknown file extension ${extension} for file ${filename}. Skipping\n"
						continue
						;;
					esac

					if [ $QUIET != 1 ]; then
						printf -v filename_esc "%q" "${filename}"
					fi

					filenamenospace=${filename//[[:blank:]]/}
					# Create the url to post to by combining the Canonical name and the file name
					urlNew="${url}/$(echo $canonicalName | sed 's|^\./||')/${filenamenospace}"

					if [ $QUIET != 1 ]; then
						printf '%s\n' "-------------"
						printf "cURL: Posting \e[1m${filename}\e[0m\n"
						printf "      to URL: ${urlNew}\n"
					fi

					case $url in
					"https://"*)
						args=("${contentEncoding}" "${contentType}" "-HConnection: close" "${authHeader[@]}" ${ssl} "-X" "PUT" "-w" "%{http_code}" "--data-binary" @"${filename}" ${urlNew})
						;;
					"http://"*)
						args=("${contentEncoding}" "${contentType}" "-HConnection: close" ${credentials} "-X" "PUT" "-w" "%{http_code}" "--data-binary" @"${filename}" ${urlNew})
						;;
					esac

					if [ $QUIET != 1 ]; then
						response=$(curl "${args[@]}" -o /dev/null | tail -n1)
					else
						response=$(curl "${args[@]}" -s)
					fi

					# Show some output based on the response of the upload
					if [ $response -ne 200 ]; then
						failedFiles+=("$canonicalName/$filenamenospace")
						if [ $(du -s $filename | awk '{print $1}') != ' ' ]; then
							currentProcessedSize=$(($currentProcessedSize + $(du -s $filename | awk '{print $1}')))
						fi

						if [ $QUIET != 1 ]; then
							printf "cURL: HTTP Code ${response}\n"
							printf "cURL: \e[31;1mError\e[0m posting file ${directory}/${filename}\n"
							printf "$(date) cURL: HTTP Code ${response} for file ${directory}/${filename}\n" >>"$pwd/curl_output.txt"
							echo "curl $(printf "'%s' " "${args[@]}" | sed -e "s/'\([^' ]*\)'/\1/g")" >>"$pwd/curl_output.txt"
						fi
					else
						postedFiles+=("$canonicalName/$filenamenospace")
						if [[ $(du -s $filename | awk '{print $1}') = *[!\ ]* ]]; then
							currentProcessedSize=$(($currentProcessedSize + $(du -s $filename | awk '{print $1}')))
						fi

						# Track the correctly uploaded files - don't move if we are not tracking or we are already in `loaded`
						if [ $TRACK != 0 ] && [[ $PWD != *"/loaded" ]]; then
							mv "$filename" ${loaded_dir}
						fi

						if [ $QUIET != 1 ]; then
							printf "cURL: HTTP Code ${response}\n"
							printf "cURL: File posted \e[1msuccessfully\e[0m\n"
							printf "$(date) cURL: HTTP Code ${response} for file ${directory}/${filename}\n" >>"$pwd/curl_output.txt"
							echo "curl $(printf "'%s' " "${args[@]}" | sed -e "s/'\([^' ]*\)'/\1/g")" >>"$pwd/curl_output.txt"
						fi
					fi

					# Calculate how much of the payload has been processed
					currentProgress=$(echo "scale=2 ; (($currentProcessedSize / $totalFileSize)) * 100" | bc)%
					floatProgress=$(echo "scale=2 ; (($currentProcessedSize / $totalFileSize)) * 100" | bc)

					# Convert floatProgress into an int
					progress=${floatProgress%.*}
					remaining=$((100 - $progress))

					# p=$(printf '—%.0s' {1..$progress})
					# l=$(printf ' %.0s' {1..$remaining})

					# Output the progress bar
					if [ $QUIET != 1 ]; then
						# printf "\n%s\n" "PROGRESS: ${currentProgress}: | $p$l |"
						printf "\n%s\n" "========== PROGRESS: ${currentProgress} completed =========="
					else
						# If we are in quiet mode, we need to output a bar that overwrites itself every time it updates
						printf "\r%s" "========== PROGRESS: ${currentProgress} completed =========="
					fi

					sleep 1
				done
			fi
			# Return to data/
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