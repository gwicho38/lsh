#!/bin/bash
##
# Run All LSH Monitoring Jobs Manually
# Usage: ./scripts/run-all-monitoring.sh [job-name]
##

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🔄 Running LSH Monitoring Jobs"
echo "=============================="
echo

# Create logs directory
mkdir -p "${PROJECT_DIR}/logs"

if [[ "${1:-}" == "" ]]; then
    echo "Running all monitoring jobs..."
    echo

    # Run all jobs
    for job in "${PROJECT_DIR}"/scripts/monitoring-jobs/*.sh; do
        job_name=$(basename "$job" .sh)
        echo "📊 Running: $job_name"

        if "$job" >> "${PROJECT_DIR}/logs/${job_name}-manual.log" 2>&1; then
            echo "   ✅ Completed"
        else
            echo "   ❌ Failed (check logs/${job_name}-manual.log)"
        fi
    done

    echo
    echo "📋 View logs in: ${PROJECT_DIR}/logs/"

elif [[ -f "${PROJECT_DIR}/scripts/monitoring-jobs/${1}.sh" ]]; then
    echo "📊 Running single job: $1"
    echo

    if "${PROJECT_DIR}/scripts/monitoring-jobs/${1}.sh"; then
        echo "✅ Job completed successfully"
    else
        echo "❌ Job failed"
        exit 1
    fi
else
    echo "❌ Job not found: $1"
    echo
    echo "Available jobs:"
    ls "${PROJECT_DIR}/scripts/monitoring-jobs/"*.sh | xargs -n1 basename | sed 's/.sh$//' | sed 's/^/  • /'
    exit 1
fi
