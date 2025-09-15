#!/bin/bash
# Script to clean up the old problematic lsh user

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Cleaning up old lsh user...${NC}"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root (use sudo)${NC}"
   exit 1
fi

SERVICE_USER="lsh"

# Check if user exists
if dscl . -list /Users | grep -q "^$SERVICE_USER$"; then
    echo "Removing old user $SERVICE_USER from directory services..."
    dscl . -delete "/Users/$SERVICE_USER"
    echo -e "${GREEN}User $SERVICE_USER removed from directory services ✅${NC}"
else
    echo "User $SERVICE_USER does not exist in directory services"
fi

# Flush directory service cache
echo "Flushing directory service cache..."
dscacheutil -flushcache

# Wait a moment for cache to clear
sleep 1

# Verify user is gone
if ! dscl . -list /Users | grep -q "^$SERVICE_USER$" && ! id "$SERVICE_USER" &>/dev/null; then
    echo -e "${GREEN}User cleanup completed successfully! ✅${NC}"
    echo "You can now run the daemon installation:"
    echo "  sudo bash scripts/install-daemon.sh"
else
    echo -e "${RED}User cleanup may not have completed properly${NC}"
    echo "Check manually with: dscl . -list /Users | grep lsh"
fi