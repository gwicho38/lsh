#!/bin/bash
# Quick Start Script for ML Dashboard
# Starts LSH daemon, pipeline service, and MCLI dashboard

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     ML Dashboard Quick Start          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Function to check if service is running
check_service() {
    local port=$1
    local name=$2
    if lsof -i ":$port" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ $name is running on port $port${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  $name is not running${NC}"
        return 1
    fi
}

# 1. Check/Start LSH Daemon
echo -e "${BLUE}[1/4] Checking LSH Daemon...${NC}"
if lsh daemon status >/dev/null 2>&1; then
    echo -e "${GREEN}✅ LSH Daemon is running${NC}"
else
    echo -e "${YELLOW}⚡ Starting LSH Daemon...${NC}"
    lsh daemon start
fi

# 2. Check/Start Pipeline Service
echo -e "\n${BLUE}[2/4] Checking Pipeline Service...${NC}"
if ! check_service 3034 "Pipeline Service"; then
    echo -e "${YELLOW}⚡ Starting Pipeline Service...${NC}"

    cd ~/repos/lsh

    # Build if needed
    if [[ ! -f dist/pipeline/pipeline-service.js ]]; then
        echo -e "${BLUE}📦 Building TypeScript...${NC}"
        npm run build
    fi

    # Start service in background
    nohup node dist/pipeline/pipeline-service.js > /tmp/lsh-pipeline.log 2>&1 &
    echo $! > /tmp/lsh-pipeline.pid

    # Wait for startup
    echo -e "${BLUE}⏳ Waiting for service to start...${NC}"
    for i in {1..10}; do
        if curl -s http://localhost:3034/api/health >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Pipeline Service started (PID: $(cat /tmp/lsh-pipeline.pid))${NC}"
            break
        fi
        sleep 1
        if [ $i -eq 10 ]; then
            echo -e "${RED}❌ Failed to start Pipeline Service${NC}"
            echo -e "${YELLOW}💡 Check logs: tail -f /tmp/lsh-pipeline.log${NC}"
            exit 1
        fi
    done
fi

# 3. Start API Server (if not running)
echo -e "\n${BLUE}[3/4] Checking LSH API Server...${NC}"
if ! check_service 3030 "LSH API Server"; then
    echo -e "${YELLOW}⚡ Starting LSH API Server...${NC}"

    # Start API in background
    export LSH_API_ENABLED=true
    export LSH_API_PORT=3030
    lsh api start --port 3030 > /tmp/lsh-api.log 2>&1 &

    sleep 2

    if check_service 3030 "LSH API Server"; then
        API_KEY=$(grep "API Key:" /tmp/lsh-api.log | awk '{print $NF}')
        echo -e "${GREEN}✅ API Server started${NC}"
        echo -e "${BLUE}🔑 API Key: ${NC}$API_KEY"
    fi
fi

# 4. Start MCLI Dashboard
echo -e "\n${BLUE}[4/4] Starting MCLI ML Dashboard...${NC}"

# Check if mcli is available
if ! command -v mcli >/dev/null 2>&1; then
    echo -e "${RED}❌ MCLI not found in PATH${NC}"
    echo -e "${YELLOW}💡 Install MCLI:${NC}"
    echo -e "   cd ~/repos/mcli"
    echo -e "   uv sync --extra dashboard"
    exit 1
fi

# Check if Streamlit is available
if ! python3 -c "import streamlit" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Streamlit not installed${NC}"
    echo -e "${BLUE}📦 Installing dashboard dependencies...${NC}"
    cd ~/repos/mcli
    uv sync --extra dashboard
fi

echo -e "${GREEN}✅ All services ready!${NC}"
echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Dashboard URLs                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}📊 LSH Pipeline Dashboard:${NC}"
echo -e "   🏠 Hub:      ${BLUE}http://localhost:3034/hub${NC}"
echo -e "   📈 Pipeline: ${BLUE}http://localhost:3034/dashboard/${NC}"
echo -e "   🤖 ML:       ${BLUE}http://localhost:3034/ml/dashboard${NC}"
echo ""
echo -e "${GREEN}🧠 MCLI ML Dashboard (Streamlit):${NC}"
echo -e "   Starting on ${BLUE}http://localhost:8501${NC}"
echo ""
echo -e "${GREEN}🔌 LSH API:${NC}"
echo -e "   ${BLUE}http://localhost:3030/api/status${NC}"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}💡 Press Ctrl+C to stop the ML dashboard${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Launch MCLI dashboard (this will block)
cd ~/repos/mcli
mcli workflow dashboard launch
