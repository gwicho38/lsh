#!/bin/bash
set -e

# LSH Installation Script
# This script installs lsh globally from npm or from source

VERSION="0.3.0"
SCRIPT_NAME="$(basename "$0")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════╗"
    echo "║     LSH Shell Installation Script      ║"
    echo "║          Version ${VERSION}                 ║"
    echo "╚════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_step() {
    echo -e "${BLUE}▶${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

check_command() {
    if command -v "$1" &> /dev/null; then
        return 0
    else
        return 1
    fi
}

check_prerequisites() {
    print_step "Checking prerequisites..."

    # Check Node.js
    if ! check_command node; then
        print_error "Node.js is not installed"
        echo "Please install Node.js 18.x or higher from https://nodejs.org/"
        exit 1
    fi

    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version must be 18 or higher (current: $(node --version))"
        exit 1
    fi
    print_success "Node.js $(node --version) found"

    # Check npm
    if ! check_command npm; then
        print_error "npm is not installed"
        exit 1
    fi
    print_success "npm $(npm --version) found"

    # Check if running with sudo for global install
    if [ "$EUID" -ne 0 ] && [ "$INSTALL_TYPE" = "global" ]; then
        print_warning "Global installation may require sudo privileges"
    fi
}

install_from_npm() {
    print_step "Installing lsh from npm..."

    if [ "$USE_SUDO" = "true" ]; then
        sudo npm install -g lsh@latest
    else
        npm install -g lsh@latest
    fi

    if [ $? -eq 0 ]; then
        print_success "LSH installed successfully from npm!"
    else
        print_error "Failed to install from npm"
        exit 1
    fi
}

install_from_source() {
    print_step "Installing lsh from source..."

    # Check if we're in the lsh directory
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Please run this script from the lsh repository root."
        exit 1
    fi

    # Install dependencies
    print_step "Installing dependencies..."
    npm install

    # Build the project
    print_step "Building project..."
    npm run build

    # Link globally
    print_step "Linking globally..."
    if [ "$USE_SUDO" = "true" ]; then
        sudo npm link
    else
        npm link
    fi

    if [ $? -eq 0 ]; then
        print_success "LSH installed successfully from source!"
    else
        print_error "Failed to install from source"
        exit 1
    fi
}

verify_installation() {
    print_step "Verifying installation..."

    if check_command lsh; then
        VERSION_OUTPUT=$(lsh --version 2>&1 || echo "unknown")
        print_success "LSH is installed: $VERSION_OUTPUT"

        # Test basic command
        if lsh --help > /dev/null 2>&1; then
            print_success "LSH is working correctly"
        else
            print_warning "LSH command runs but --help failed"
        fi
    else
        print_error "LSH command not found in PATH"
        print_warning "You may need to:"
        echo "  1. Restart your terminal"
        echo "  2. Run: hash -r (bash/zsh) or rehash (zsh)"
        echo "  3. Check your PATH includes: $(npm prefix -g)/bin"
    fi
}

setup_shell_integration() {
    print_step "Setting up shell integration..."

    SHELL_TYPE=$(basename "$SHELL")

    case "$SHELL_TYPE" in
        bash)
            RC_FILE="$HOME/.bashrc"
            ;;
        zsh)
            RC_FILE="$HOME/.zshrc"
            ;;
        *)
            print_warning "Unknown shell: $SHELL_TYPE"
            return
            ;;
    esac

    if [ -f "$RC_FILE" ]; then
        echo ""
        echo "Would you like to add LSH to your $RC_FILE for easy access? (y/n)"
        read -r response

        if [ "$response" = "y" ] || [ "$response" = "Y" ]; then
            if ! grep -q "# LSH Shell Integration" "$RC_FILE"; then
                echo "" >> "$RC_FILE"
                echo "# LSH Shell Integration" >> "$RC_FILE"
                echo "export PATH=\"\$PATH:$(npm prefix -g)/bin\"" >> "$RC_FILE"
                print_success "Added LSH to $RC_FILE"
                print_warning "Run: source $RC_FILE"
            else
                print_success "LSH already in $RC_FILE"
            fi
        fi
    fi
}

show_next_steps() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════${NC}"
    echo -e "${GREEN}Installation Complete!${NC}"
    echo -e "${CYAN}═══════════════════════════════════════${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Restart your terminal or run: source ~/.bashrc (or ~/.zshrc)"
    echo "  2. Run: lsh --help"
    echo "  3. Run: lsh --version"
    echo ""
    echo "Configuration:"
    echo "  • Copy .env.example to .env and configure"
    echo "  • Review documentation at: https://github.com/gwicho38/lsh"
    echo ""
    echo "Update lsh:"
    echo "  • Run: lsh self update"
    echo ""
}

# Main installation flow
main() {
    print_header

    # Parse arguments
    INSTALL_TYPE="npm"  # default to npm
    USE_SUDO="false"

    while [[ $# -gt 0 ]]; do
        case $1 in
            --source)
                INSTALL_TYPE="source"
                shift
                ;;
            --npm)
                INSTALL_TYPE="npm"
                shift
                ;;
            --sudo)
                USE_SUDO="true"
                shift
                ;;
            --help|-h)
                echo "Usage: $SCRIPT_NAME [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --npm       Install from npm (default)"
                echo "  --source    Install from source"
                echo "  --sudo      Use sudo for global installation"
                echo "  --help      Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Run '$SCRIPT_NAME --help' for usage"
                exit 1
                ;;
        esac
    done

    # Run installation
    check_prerequisites

    if [ "$INSTALL_TYPE" = "npm" ]; then
        install_from_npm
    else
        install_from_source
    fi

    verify_installation
    setup_shell_integration
    show_next_steps
}

# Run main function
main "$@"
