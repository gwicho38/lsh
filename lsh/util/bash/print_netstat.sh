#!/bin/bash

# Log file path
LOGFILE="~/tmp/20231207.log"

# Interval in seconds between each netstat command
INTERVAL=5

# Infinite loop
while true; do
	# Append the current timestamp and netstat output to the log file
	echo "---- $(date) ----"
	netstat

	# Wait for the specified interval
	sleep $INTERVAL
done
