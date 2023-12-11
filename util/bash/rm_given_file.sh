#!/bin/bash

# Use rg to list all files, then filter with grep
# - Ensure you have `rg` (ripgrep) installed and in your PATH
# - The following command will generate a list of files that include "files" in their names

# Check if exactly one argument is given
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <file_name>"
    exit 1
fi


# The directory to change to is the first argument
target_file=$1

file_list=$(rg --files | grep $target_file)

# Check if file_list is not empty
if [ -z "$file_list" ]; then
  echo "No files to delete."
  exit 0
fi

# Iterate over the file list and delete each file
for file in $file_list; do
  # Uncomment the line below after confirming it lists the correct files
  # rm "$file" && echo "Deleted $file" || echo "Failed to delete $file"
  echo "Would delete $file"
done

# End of the script
