#!/usr/bin/env bash

# This script changes the current working directory to the one provided as an argument.

# Check if exactly one argument is given
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <directory_path>"
    exit 1
fi

# The directory to change to is the first argument
target_directory=$1

zip -d $target_directory __MACOSX/\* \*/.DS_Store; 