#!/usr/bin/env zsh

function gcloud_ws_start() {
  gcloud workstations start --project=remote-ws-88 --cluster=cluster-cirrus-ws --config=config-cirrus-ws --region=us-west1 apps-luis-fernandez-de-la-vara
}

function gcloud_ws_status() {

}

function gcloud_ws_tunnel() {
  gcloud workstations start-tcp-tunnel --project=remote-ws-88 --cluster=cluster-cirrus-ws --config=config-cirrus-ws --region=us-west1 apps-luis-fernandez-de-la-vara 22 --local-host-port=:2222
}

# Command handling
handle_command() {
  case "$1" in
  start)
    gcloud_ws_start
    ;;
  tunnel)
    gcloud_ws_tunnel
    ;;
  status)
    gcloud_ws_status
    ;;
  *)
    echo "Invalid command: $1"
    echo "Valid commands: start, tunnel, status"
    exit 1
    ;;
  esac
}

# Main logic
if [[ "$#" -ne 1 ]]; then
  echo "Usage: $0 {start|tunnel|status}"
  exit 1
fi

handle_command "$1"
