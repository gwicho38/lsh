#!/usr/bin/env bash

# To find the pids for given process, and kill if its parent process is root process
# params:
# 	$1 - subprocess path, e.g., in Mac, it is `/extension/out/node_modules/sync-rpc/lib/worker.js` for sync-rpc worker process.
#	$2 - name of the target process to print in log, e.g. `syncRpc`` 
#	$3 - codeProcessPath, which points to the path of VsCode executable.
# 	$4 - electron flag, typically "--ms-enable-electron-run-as-node"
#	$5 - PID for root process, which is 1 with MacOs, and under Linux, it is user root process PID.
removeIfOrphanedProcess() {
	pids=$( ps x | grep "$3" | grep -- "$4" | grep "$1" | grep -wv grep | awk '{print $1}' )
	for id in ${pids}; do
		echo "$2: ${id}" >&2
		parents=$( ps -efj | grep $id | grep -wv grep | awk '{print $3}' | grep -v $id )
		for parent in ${parents}; do
			echo "$id parent: ${parent}" >&2
			if [ ${parent} == "$5" ] || [ ${parent} == "1" ]
			then
				echo "orphaned process $id identified, killing the process" >&2
				kill -9 $id
			fi
		done
	done
}

echo "check & clean orphaned processes started"
electron="--ms-enable-electron-run-as-node"
syncRpcWorker="/node_modules/sync-rpc/lib/worker.js"
ioWorker="VsCodeIoWorker.js"

if [[ "$OSTYPE" == "darwin"* ]]; then
	echo "OS: Mac" >&2
	# need to match `...test-resources/Visual Studio Code.app/Contents/Frameworks/Code Helper.app/...` and `/Applications/Visual Studio Code.app/Contents/Frameworks/Code Helper (Plugin).app/...`
	codeHelper="/Visual Studio Code.app/Contents/Frameworks/Code Helper"
	tsserver="/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/node_modules/typescript/lib/tsserver.js"
	typingsInstaller="/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/node_modules/typescript/lib/typingsInstaller.js"
	bootstrap="/Applications/Visual Studio Code.app/Contents/Resources/app/out/bootstrap-fork"
	rootPid="1"

	bootstrapPids=$( ps x | grep "${codeHelper}" | grep -- "${electron}" | grep "${bootstrap}" | grep -wv grep | awk '{print $1}' )
	for id in ${bootstrapPids}; do
		echo "bootstrap: ${id}" >&2
	done

	removeIfOrphanedProcess "${syncRpcWorker}" "syncRpc" "${codeHelper}" "${electron}" "${rootPid}"
	removeIfOrphanedProcess "${typingsInstaller}" "typingsInstaller" "${codeHelper}" "${electron}" "${rootPid}"
	removeIfOrphanedProcess "${tsserver}" "tsserver" "${codeHelper}" "${electron}" "${rootPid}"
	removeIfOrphanedProcess "${ioWorker}" "VsCodeIoWorker" "${codePath}" "${electron}" "${rootPid}"
	echo "check & clean orphaned processes finished"

elif [[ "$OSTYPE" == "linux"* ]]; then
  echo "OS: Linux" >&2
  codePath="/usr/share/code/code"
  tsserver="/usr/share/code/resources/app/extensions/node_modules/typescript/lib/tsserver.js"
  typingsInstaller="/usr/share/code/resources/app/extensions/node_modules/typescript/lib/typingsInstaller.js"
  bootstrap="/usr/share/code/resources/app/out/bootstrap-fork"
  # user instance of systemd, which will be the parent of zombie processes.
  userSystemd="/usr/lib/systemd/systemd --user"
  rootPid=$( ps x | grep "${userSystemd}" | grep -wv grep | awk '{print $1}' )
  echo "systemd --user PID: ${rootPid}" >&2
  
  bootstrapPids=$( ps x | grep "${codePath}" | grep -- "${electron}" | grep "${bootstrap}" | grep -wv grep | awk '{print $1}' )
  for id in ${bootstrapPids}; do
  	echo "bootstrap: ${id}" >&2
  done
  
  removeIfOrphanedProcess "${syncRpcWorker}" "syncRpc" "${codePath}" "${electron}" "${rootPid}"
  removeIfOrphanedProcess "${typingsInstaller}" "typingsInstaller" "${codePath}" "${electron}" "${rootPid}"
  removeIfOrphanedProcess "${tsserver}" "tsserver" "${codePath}" "${electron}" "${rootPid}"
  removeIfOrphanedProcess "${ioWorker}" "VsCodeIoWorker" "${codePath}" "${electron}" "${rootPid}"
  echo "check & clean orphaned processes finished"
fi

# TODO: PLAT-51037: remove orphaned processes in Linux and Windows.
