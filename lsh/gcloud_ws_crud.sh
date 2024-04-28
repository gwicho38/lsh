#!/bin/bash

# Define constants
# PROJECT="remote-ws-88"
PROJECT="modern-media-421515"
CLUSTER="cluster-cirrus-ws"
CONFIG="config-cirrus-ws"
REGION="us-west1"
WORKSTATION_NAME="apps-luis-fernandez-de-la-vara"

# Function to create a workstation
gcloud_ws_create() {
	echo "Creating workstation $WORKSTATION_NAME..."
	gcloud alpha workstations create $WORKSTATION_NAME --project=$PROJECT --cluster=$CLUSTER --config=$CONFIG --region=$REGION
}

gcloud_ws_start() {
	gcloud workstations start --project=remote-ws-88 --cluster=cluster-cirrus-ws --config=config-cirrus-ws --region=us-west1 apps-luis-fernandez-de-la-vara
}

# Function to delete a workstation
gcloud_ws_delete() {
	echo "Deleting workstation $WORKSTATION_NAME..."
	gcloud alpha workstations delete $WORKSTATION_NAME --project=$PROJECT --cluster=$CLUSTER --config=$CONFIG --region=$REGION
}

gcloud_ws_status() {
	echo "Status workstation $WORKSTATION_NAME..."
	gcloud alpha workstations describe $WORKSTATION_NAME --project=$PROJECT --cluster=$CLUSTER --config=$CONFIG --region=$REGION
}

# Command handling
handle_command() {
	case "$1" in
	create)
		gcloud_ws_create
		;;
	delete)
		gcloud_ws_delete
		;;
	status)
		gcloud_ws_status
		;;
	start)
		gcloud_ws_start
		;;
	*)
		echo "Invalid command: $1"
		echo "Valid commands: create, delete, status"
		exit 1
		;;
	esac
}

# Main logic
if [[ "$#" -ne 1 ]]; then
	echo "Usage: $0 {create|delete|status}"
	exit 1
fi

handle_command "$1"
