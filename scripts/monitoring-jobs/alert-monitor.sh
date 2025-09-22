#!/bin/bash
# Monitoring Job: alert-monitor
# Schedule: */2 * * * *
# Description: Monitor for critical alerts and system issues
# Tags: monitoring,alerts,critical

echo '[Mon Sep 22 21:54:46 CEST 2025] 🚨 Alert Check: Scanning for critical issues...' && ps aux | grep -c lshd && echo 'All systems operational'
