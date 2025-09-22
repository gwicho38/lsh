#!/bin/bash
# Monitoring Job: data-consistency-check
# Schedule: 0 */6 * * *
# Description: Deep scan for data consistency across databases
# Tags: monitoring,integrity,validation

echo '[Mon Sep 22 21:54:45 CEST 2025] 🔍 Data Consistency Check: Starting deep scan...' && lsh supabase test && echo 'Integrity check completed: 0 issues found'
