sudo openvpn --config "${{ github.workspace }}/c3/c3server/.github/vpn/c3-us-vpn-github-actions.conf" --log "vpn.log" --daemon

# route -n get default | grep interface | awk '{print $2}'
export ACTIVE_INTERFACE=en0
#  networksetup -listnetworkserviceorder | grep -B 1 "$ACTIVE_INTERFACE" | head -n 1 | awk '/\([0-9]+\)/{ print }'|cut -d " " -f2- 
export ACTIVE_NETWORK_SERVICE=Wi-Fi


 
 networksetup -setdnsservers "$ACTIVE_NETWORK_SERVICE" 8.8.8.8