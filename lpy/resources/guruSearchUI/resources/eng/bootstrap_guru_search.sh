#!/bin/bash

# Function to check directory existence and create if not exists
check_and_create_dir() {
    if [ ! -d "$1" ]; then
        mkdir -p "$1"
    fi
}

# Step 1-3: Create directories if they do not exist
check_and_create_dir ~/c3/
check_and_create_dir ~/c3/wt/
check_and_create_dir ~/c3/prov/c3fed/cornea/

# Step 4-5: Clone git repositories if they do not exist
if [ ! -d "~/c3/c3generativeAi" ]; then
    git clone https://github.com/c3-e/c3generativeAi ~/c3/
fi

if [ ! -d "~/c3/c3fed" ]; then
    git clone https://github.dev/c3-e/c3fed ~/c3/
fi

# Step 6: Provide comment regarding the git worktree
echo "# Until govSecurityV8 is merged into c3fed, the following worktree shall be included"

# Step 7: Checkout worktree branch
if [ -d "~/c3/c3fed" ]; then
    cd ~/c3/c3fed
    git worktree add -b feature-branch ../wt/v8/c3fed.worktrees/feature/lefv/cor-201 https://github.com/c3-e/c3fed/pull/2021
    cd -
fi

# Step 8: Comment about the recommended workflow
echo "# Recommended workflow includes performing these steps using git worktrees"

# Step 9-10: Create symbolic links
ln -s ~/c3/c3fed/cornea/guruSearch ~/c3/prov/c3fed/cornea/guruSearch
ln -s ~/c3/c3fed/cornea/guruSearchUI ~/c3/prov/c3fed/cornea/guruSearchUI

for dir in ~/c3/c3generativeAi/genai/*; do
    if [ -d "$dir" ]; then
        ln -s "$dir" ~/c3/prov/c3fed/cornea/
    fi
done

# Step 11: Create symbolic link for worktree
ln -s ~/c3/wt/v8/c3fed.worktrees/feature/lefv/cor-201/v8/govSecurityV8 ~/c3/prov/c3fed/cornea/

# Step 12-13: Change directory and run command
cd ~/c3/prov/c3fed/cornea/
code .