# Running Headless openvpn

1. unzip files and copy to well known location

  `brew install openvpn
  echo $PWD`
  `mkdir -p /usr/local/opt/openvpn/`
  `cp -rf ./ovpn/* /usr/local/opt/openvpn`
  `cd /usr/local/opt/openvpn/`
  ```
  # run client 
  sudo /usr/local/opt/openvpn/sbin/openvpn --config client.conf

  ```

