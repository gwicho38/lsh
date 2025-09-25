#!/bin/bash
# LSH Pipeline Dashboard Launcher
# Single-click launcher for the dashboard interface

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
DASHBOARD_URL="http://localhost:3034/hub"
LSH_PATH="/Users/lefv/repos/lsh"
MCLI_PATH="/Users/lefv/repos/mcli"

echo -e "${BLUE}🚀 MCLI Workflow Dashboard Launcher${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""

# Check if uv is available
if ! command -v uv >/dev/null 2>&1; then
    echo -e "${RED}❌ Error: uv is not installed or not in PATH${NC}"
    echo -e "${YELLOW}💡 Install uv first: curl -LsSf https://astral.sh/uv/install.sh | sh${NC}"
    exit 1
fi

# Try mcli workflow dashboard run first
if command -v mcli >/dev/null 2>&1; then
    echo -e "${YELLOW}⚡ Launching dashboard via MCLI...${NC}"
    cd "$MCLI_PATH" || {
        echo -e "${YELLOW}⚠️  Cannot find MCLI directory, falling back to LSH service${NC}"
        cd "$LSH_PATH"
    }

    # Launch the dashboard using mcli
    if mcli workflow dashboard run 2>/dev/null; then
        echo -e "${GREEN}✅ Dashboard launched via MCLI successfully!${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠️  MCLI launch failed, falling back to LSH service...${NC}"
    fi
fi

# Fallback: Launch LSH pipeline service directly
cd "$LSH_PATH" || {
    echo -e "${RED}❌ Error: Cannot find LSH directory at $LSH_PATH${NC}"
    exit 1
}

# Check if service is already running
if lsof -i :3034 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Pipeline Service is already running${NC}"
else
    echo -e "${YELLOW}⚡ Starting Pipeline Service...${NC}"

    # Compile TypeScript if needed
    if [[ ! -f dist/pipeline/pipeline-service.js ]] || [[ src/pipeline/pipeline-service.ts -nt dist/pipeline/pipeline-service.js ]]; then
        echo -e "${BLUE}📦 Compiling TypeScript...${NC}"
        npm run compile-ts >/dev/null 2>&1
    fi

    # Start the service in background
    nohup node dist/pipeline/pipeline-service.js >/dev/null 2>&1 &
    SERVICE_PID=$!

    # Wait for service to start
    echo -e "${BLUE}⏳ Waiting for service to start...${NC}"
    for i in {1..10}; do
        if curl -s "$DASHBOARD_URL" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Pipeline Service started successfully (PID: $SERVICE_PID)${NC}"
            break
        fi
        sleep 1
        if [ $i -eq 10 ]; then
            echo -e "${RED}❌ Failed to start Pipeline Service${NC}"
            exit 1
        fi
    done
fi

# Open dashboard in default browser
echo -e "${BLUE}🌐 Opening dashboard in browser...${NC}"
open "$DASHBOARD_URL"

echo ""
echo -e "${GREEN}✨ Dashboard launched successfully!${NC}"
echo -e "${BLUE}📊 Hub: ${NC}$DASHBOARD_URL"
echo -e "${BLUE}📈 Pipeline: ${NC}http://localhost:3034/dashboard/"
echo -e "${BLUE}🤖 ML: ${NC}http://localhost:3034/ml/dashboard"
echo -e "${BLUE}🔧 CI/CD: ${NC}http://localhost:3034/cicd/dashboard"
echo ""
echo -e "${YELLOW}💡 To stop the service, run:${NC} pkill -f 'node dist/pipeline/pipeline-service.js'"