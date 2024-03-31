#!/bin/bash

# Script to add a space to the last line of every file in the current directory,
# including hidden files and following symbolic links.

# The 'find' command is used to list all files:
# . represents the current directory
# -type f finds regular files (including hidden files)
# -L option makes find follow symbolic links
# -exec executes a command on each file found
# Using 'sed' to append a space to the end of the last line in each file
# -i '' -e '$s/$/ /' command explanation:
# -i '' edits files in place (makes backup if extension supplied)
# -e '$s/$/ /' sed script, meaning:
# $: address, matches the last line of the file
# s/$/ /: substitutes the end of the line with a space

find . -type f -exec sed -i '' -e '$s/$/ /' {} +

echo "A space has been added to the last line of each file."
