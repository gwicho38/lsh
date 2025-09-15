#!/bin/bash
# Script to repair the incomplete lsh user on macOS

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Repairing lsh user...${NC}"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root (use sudo)${NC}"
   exit 1
fi

SERVICE_USER="lsh"

# First, check current state
echo "Current state of user $SERVICE_USER:"
echo "-----------------------------------"
dscl . -read /Users/$SERVICE_USER 2>/dev/null || echo "User not found in directory services"
echo ""

# Find next available UID
echo "Finding next available UID..."
next_uid=501
while dscl . -list /Users UniqueID | grep -q " $next_uid$"; do
    ((next_uid++))
done
echo "Next available UID: $next_uid"

# Add missing attributes
echo ""
echo "Adding missing attributes..."

# Add UniqueID if missing
if ! dscl . -read /Users/$SERVICE_USER UniqueID &>/dev/null; then
    echo "Adding UniqueID $next_uid"
    dscl . -create /Users/$SERVICE_USER UniqueID $next_uid
else
    echo "UniqueID already exists"
fi

# Add PrimaryGroupID if missing (20 = staff group)
if ! dscl . -read /Users/$SERVICE_USER PrimaryGroupID &>/dev/null; then
    echo "Adding PrimaryGroupID 20 (staff)"
    dscl . -create /Users/$SERVICE_USER PrimaryGroupID 20
else
    echo "PrimaryGroupID already exists"
fi

# Add NFSHomeDirectory if missing
if ! dscl . -read /Users/$SERVICE_USER NFSHomeDirectory &>/dev/null; then
    echo "Adding NFSHomeDirectory /opt/lsh"
    dscl . -create /Users/$SERVICE_USER NFSHomeDirectory /opt/lsh
else
    echo "NFSHomeDirectory already exists"
fi

# Add UserShell if missing
if ! dscl . -read /Users/$SERVICE_USER UserShell &>/dev/null; then
    echo "Adding UserShell /usr/bin/false"
    dscl . -create /Users/$SERVICE_USER UserShell /usr/bin/false
else
    echo "UserShell already exists"
fi

# Flush the directory service cache
echo ""
echo "Flushing directory service cache..."
dscacheutil -flushcache

# Wait a moment for cache to clear
sleep 1

# Verify the user is now functional
echo ""
echo "Verifying user..."
if id $SERVICE_USER &>/dev/null; then
    echo -e "${GREEN}Success! User $SERVICE_USER is now functional.${NC}"
    echo ""
    echo "User details:"
    id $SERVICE_USER
    echo ""
    echo "Directory service record:"
    dscl . -read /Users/$SERVICE_USER UniqueID PrimaryGroupID NFSHomeDirectory UserShell 2>/dev/null | grep -E "^(UniqueID|PrimaryGroupID|NFSHomeDirectory|UserShell):"
else
    echo -e "${RED}Failed to repair user. The user may need to be deleted and recreated.${NC}"
    echo ""
    echo "To delete the user, run:"
    echo "  sudo dscl . -delete /Users/$SERVICE_USER"
    echo ""
    echo "Then run the daemon installation script again."
    exit 1
fi

echo ""
echo -e "${GREEN}User repair completed successfully!${NC}"
echo "You can now run the daemon installation script:"
echo "  sudo bash scripts/install-daemon.sh"