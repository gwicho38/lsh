environment: `https://gkev8dev.c3dev.cloud/c3/studio/envs/gkev8dev-lefv20231117`

c3fed branch: ` cornea/release3_rc`

c3genai branch: on develop `6a35d38ae843803615527f0c0406543e666bc1e7` 

naming convention: {name}{date}[?time]

cleanup generated files: 

```sh

 # Function toclean directories and files
clean_v8_directories() {
  # If an argument is provided, use it as the root directory. Otherwise, use the current working directory.
  ROOT_DIR=${1:-$PWD}

  echo "Cleaning directories and files under: $ROOT_DIR"

  # Loop through each directory and file recursively to find directories named "gen" or ".vs-cache"
  # The -L option makes find follow symbolic links, so they are treated as the type of file to which they point.
  find -L "$ROOT_DIR" -type d \( -name "gen" -o -name ".vs-cache" \) -exec echo "Deleting directory: {}" \; -exec rm -rf {} \; -prune

  # Loop through each directory and file recursively to find files named ".fingerprints.txt"
  find -L "$ROOT_DIR" -type f -name ".fingerprints.txt" -exec echo "Deleting file: {}" \; -exec rm -rf {} \;

  UI_CLI_HOME="/Users/lefv/.vscode/extensions/c3ai.c3-ai-dx-v8-2.0.20/.uicli"
  rm -rf $UI_CLI_HOME \;
}

```

> clean vscode node processes

`~/.vscode/extensions/c3ai.c3-ai-dx-v8-2.0.21/removeOrphanedProcesses.sh`

	**note: this bash script will change with new versions of vscode** 

> turn off vscode

delete c3 vscode extension

`sudo pkill -9 vscode` x 3

`rm -rf ~/.vscode/extensions/c3*`

> create provision directory

`mkdir -p ~/c3/prov/gurusearch`

sim link all packages from `c3fed/cornea` and `c3generativeai/genai` into provision directory.

> open vscode

> install c3 extension

#todo 

> ticket to address vscode version persistense

vscode caches a map of workspace to c3 extension here: `/Users/lefv/Library/Application Support/Code/User/globalStorage/storage.json`

> if looking to install the extension manually, go here: 

https://marketplace.visualstudio.com/items?itemName=C3ai.c3-ai-dx-v8

install from vsix 

> validate vscode version supported by latest extension

> once vscode and c3 extension installed --> go to provision directory and open code from there

e.g., `code .`

```
Version: 1.84.2
Commit: 1a5daa3a0231a0fbba4f14db7ec463cf99d7768e
Date: 2023-11-09T10:52:33.687Z
Electron: 25.9.2
ElectronBuildId: 24603566
Chromium: 114.0.5735.289
Node.js: 18.15.0
V8: 11.4.183.29-electron.0
OS: Darwin x64 22.5.0
```


## Links

[[home/lefv-vault/c3/guru/GURU_README|GURU_README]] 