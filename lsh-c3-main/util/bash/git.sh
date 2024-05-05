#! /bin/bash

# Get a list of all files reported by `git status` that are not up to date
files=$(git status --porcelain | awk '{print $2}')

# Loop through the list of files and `touch` each one
for file in $files; do
	touch "$file"
done
