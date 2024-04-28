#!/bin/bash

# Define constants
PROJECT="remote-ws-88"
CLUSTER="cluster-cirrus-ws"
CONFIG="config-cirrus-ws"
REGION="us-west1"
LOCAL_START_PORT=3000

# Start port mapping
start_port_range() {
	exit 0
	local PORT=$1
	local LOCAL_PORT=$((LOCAL_START_PORT + PORT - 3000))
	echo "Starting tunnel for remote port $PORT to local port $LOCAL_PORT"
	gcloud workstations start-tcp-tunnel --project=$PROJECT --cluster=$CLUSTER --config=$CONFIG --region=$REGION apps-luis-fernandez-de-la-vara $PORT --local-host-port=:${LOCAL_PORT} &
}

# Stop port mapping
stop_port_range() {
	local PORT=$1
	local LOCAL_PORT=$((LOCAL_START_PORT + PORT - 3000))
	echo "Stopping tunnel for local port $LOCAL_PORT..."
	pkill -f "gcloud.*${LOCAL_PORT}"
}

start_port_range() {
	local PORT=$1
	local LOCAL_PORT=$((LOCAL_START_PORT + PORT - 3000))
	echo "Starting tunnel for remote port $PORT to local port $LOCAL_PORT"
	gcloud workstations start-tcp-tunnel --project=$PROJECT --cluster=$CLUSTER --config=$CONFIG --region=$REGION apps-luis-fernandez-de-la-vara $PORT --local-host-port=:${LOCAL_PORT} &
}

# Start port mapping
start_port_map() {
	local LOCAL_PORT=$1
	local REMOTE_PORT=$2
	echo "Starting tunnel for remote port $REMOTE_PORT to local port $LOCAL_PORT"
	gcloud workstations start-tcp-tunnel --project=$PROJECT --cluster=$CLUSTER --config=$CONFIG --region=$REGION $WORKSTATION_NAME $REMOTE_PORT --local-host-port=:${LOCAL_PORT} &
}

# Handle start or stop for a range or a single port
handle_ports() {
	local command=$1
	local start_port=$2
	local end_port=${3:-$start_port}

	for ((PORT = $start_port; PORT <= $end_port; PORT++)); do
		if [[ "$command" == "start" ]]; then
			start_port $PORT
		elif [[ "$command" == "stop" ]]; then
			stop_port $PORT
		elif [[ "$command" == "map" ]]; then
			start_port_map $PORT
		fi
	done
}

# Main logic to handle commands
if [[ "$#" -lt 2 ]]; then
	echo "Usage: $0 {start|stop} start_port [end_port]"
	exit 1
fi

case "$1" in
start | stop | map)
	handle_ports "$@"
	;;
*)
	echo "Invalid command. Usage: $0 {start|stop} start_port [end_port]"
	exit 1
	;;
esac
