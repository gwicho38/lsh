 #!/usr/bin/env bash
 
 # Function to clean directories and files
clean_v8_directories() {
  # If an argument is provided, use it as the root directory. Otherwise, use the current working directory.
  ROOT_DIR=${1:-$PWD}

  echo "Cleaning directories and files under: $ROOT_DIR"

  # Loop through each directory and file recursively to find directories named "gen" or ".vs-cache"
  # The -L option makes find follow symbolic links, so they are treated as the type of file to which they point.
  find -L "$ROOT_DIR" -type d \( -name "gen" -o -name ".vs-cache" \) -exec echo "Deleting directory: {}" \; -exec rm -rf {} \; -prune

  # Loop through each directory and file recursively to find files named ".fingerprints.txt"
  find -L "$ROOT_DIR" -type f -name ".fingerprints.txt" -exec echo "Deleting file: {}" \; -exec rm -rf {} \;

  UI_CLI_HOME="~/.vscode/extensions/c3ai.c3-ai-dx-v8-2.0.20/.uicli"
  rm -rf $UI_CLI_HOME \;
}

clean_v8_directories