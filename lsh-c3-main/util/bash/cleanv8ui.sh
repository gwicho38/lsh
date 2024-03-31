#!/usr/bin/env bash

# Function to clean directories and files
function clean_v8_directories() {
  # If an argument is provided, use it as the root directory. Otherwise, use the current working directory.
  ROOT_DIR=${1:-$PWD}

  echo "Cleaning directories and files under: $ROOT_DIR"

  # Loop through each directory and file recursively to find directories named "gen" or ".vs-cache"
  # The -L option makes find follow symbolic links, so they are treated as the type of file to which they point.
  find -L "$ROOT_DIR" -type d \( -name "gen" -o -name ".vs-cache" -o -name ".vscode/generatedSchemas" \) -exec echo "Deleting directory: {}" \; -exec rm -rf {} \; -prune

  # Loop through each directory and file recursively to find files named ".fingerprints.txt"
  find -L "$ROOT_DIR" -type f -name ".fingerprints.txt" -exec echo "Deleting file: {}" \; -exec rm -rf {} \;
}


# This script changes the current working directory to the one provided as an argument.

# Check if exactly one argument is given
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <directory_path>"
    exit 1
fi

# Save the current working directory
original_directory=$(pwd)


# The directory to change to is the first argument
target_directory=$1

# Check if the provided argument is a directory
if [ ! -d "$target_directory" ]; then
    echo "Error: '$target_directory' is not a directory."
    exit 2
fi

# Change to the provided directory
cd "$target_directory" || exit
clean_v8_directories

# Return to the original directory
cd "$original_directory" || exit

# Print the current working directory again
echo "Returned to the original directory $(pwd)"


