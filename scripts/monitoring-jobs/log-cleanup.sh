#!/bin/bash
# Monitoring Job: log-cleanup
# Schedule: 0 2 * * *
# Description: Clean up old log files and temporary data
# Tags: monitoring,cleanup,maintenance

echo '[Mon Sep 22 21:54:46 CEST 2025] 🧹 Cleanup: Removing old logs...' && find /tmp -name '*lsh*log*' -mtime +7 -delete 2>/dev/null || echo 'Cleanup completed'
