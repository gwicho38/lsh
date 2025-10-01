#!/bin/bash
set -e

# LSH Build and Publish Script
# Comprehensive build, test, and publish workflow

VERSION="1.0.0"
SCRIPT_NAME="$(basename "$0")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Functions
print_header() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════╗"
    echo "║      LSH Build & Publish Workflow        ║"
    echo "║          Version ${VERSION}                    ║"
    echo "╚══════════════════════════════════════════╝"
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

check_prerequisites() {
    print_step "Checking prerequisites..."

    if ! command -v node &> /dev/null; then
        print_error "Node.js not found"
        exit 1
    fi

    if ! command -v npm &> /dev/null; then
        print_error "npm not found"
        exit 1
    fi

    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js 18+ required (current: $(node --version))"
        exit 1
    fi

    print_success "Prerequisites OK (Node $(node --version), npm $(npm --version))"
}

# Main build workflow
main() {
    print_header

    # Parse arguments
    BUILD_TYPE="full"  # full, compile, dist
    RUN_TESTS="true"
    RUN_LINT="true"
    PUBLISH="false"
    PUBLISH_DRY_RUN="false"

    while [[ $# -gt 0 ]]; do
        case $1 in
            --compile)
                BUILD_TYPE="compile"
                shift
                ;;
            --dist)
                BUILD_TYPE="dist"
                shift
                ;;
            --full)
                BUILD_TYPE="full"
                shift
                ;;
            --no-tests)
                RUN_TESTS="false"
                shift
                ;;
            --no-lint)
                RUN_LINT="false"
                shift
                ;;
            --publish)
                PUBLISH="true"
                shift
                ;;
            --dry-run)
                PUBLISH_DRY_RUN="true"
                shift
                ;;
            --help|-h)
                echo "Usage: $SCRIPT_NAME [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --compile       Compile TypeScript only"
                echo "  --dist          Create distribution package"
                echo "  --full          Full build (default)"
                echo "  --no-tests      Skip testing"
                echo "  --no-lint       Skip linting"
                echo "  --publish       Publish to npm"
                echo "  --dry-run       Test publish (npm publish --dry-run)"
                echo "  --help          Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Run '$SCRIPT_NAME --help' for usage"
                exit 1
                ;;
        esac
    done

    check_prerequisites

    # Clean previous builds
    print_step "Cleaning previous builds..."
    npm run clean 2>/dev/null || true
    print_success "Clean completed"

    # Install dependencies
    print_step "Installing dependencies..."
    npm install
    print_success "Dependencies installed"

    # Run linting if enabled
    if [ "$RUN_LINT" = "true" ]; then
        print_step "Running ESLint..."
        npm run lint 2>&1 | tail -5
        if [ ${PIPESTATUS[0]} -eq 0 ]; then
            print_success "Linting passed"
        else
            WARNINGS=$(npm run lint 2>&1 | grep "problems" | grep -o "[0-9]* errors" | cut -d' ' -f1)
            if [ "$WARNINGS" = "0" ]; then
                print_success "Linting passed (warnings only)"
            else
                print_error "Linting failed with $WARNINGS errors"
                exit 1
            fi
        fi
    fi

    # Build based on type
    case "$BUILD_TYPE" in
        compile)
            print_step "Compiling TypeScript..."
            npm run build
            print_success "Compilation completed"
            ;;
        dist)
            print_step "Creating distribution package..."
            npm pack
            print_success "Distribution package created"
            ;;
        full)
            print_step "Building all targets..."
            npm run build
            print_success "Build completed"

            print_step "Type checking..."
            npm run typecheck
            print_success "Type checking passed"
            ;;
    esac

    # Run tests if enabled
    if [ "$RUN_TESTS" = "true" ]; then
        print_step "Running tests..."
        if npm test; then
            print_success "All tests passed"
        else
            print_error "Tests failed"
            exit 1
        fi
    fi

    # Show build artifacts
    print_step "Build artifacts:"
    if [ -d "dist" ]; then
        echo "Compiled files:"
        du -sh dist/
        echo "Key files:"
        ls -lh dist/*.js 2>/dev/null | head -5 || echo "  (TypeScript files compiled)"
    fi

    # Create tarball for inspection
    if [ "$BUILD_TYPE" = "full" ] || [ "$BUILD_TYPE" = "dist" ]; then
        print_step "Creating package tarball..."
        npm pack
        TARBALL=$(ls -t lsh-*.tgz 2>/dev/null | head -1)
        if [ -n "$TARBALL" ]; then
            print_success "Package created: $TARBALL"
            echo "Package contents:"
            tar -tzf "$TARBALL" | head -20
        fi
    fi

    # Publish dry run if requested
    if [ "$PUBLISH_DRY_RUN" = "true" ]; then
        print_step "Running publish dry-run..."
        npm publish --dry-run
        print_success "Dry-run completed (no actual publish)"
    fi

    # Publish if requested
    if [ "$PUBLISH" = "true" ]; then
        print_warning "Publishing to npm..."
        echo "This will publish lsh to the npm registry."
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            print_step "Publishing..."
            npm publish
            print_success "Published to npm!"
        else
            print_warning "Publish cancelled"
        fi
    fi

    # Show summary
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════${NC}"
    echo -e "${GREEN}Build Completed Successfully!${NC}"
    echo -e "${CYAN}═══════════════════════════════════════${NC}"
    echo ""
    echo "Next steps:"
    echo "  • Test locally: npm link"
    echo "  • Test package: npm pack && npm install -g lsh-*.tgz"
    echo "  • Dry run publish: npm publish --dry-run"
    echo "  • Publish: npm publish"
    echo "  • Update version: npm version [patch|minor|major]"
    echo ""
    echo "Verification:"
    echo "  • Check version: lsh --version"
    echo "  • Run self-update: lsh self update --check"
    echo ""
}

main "$@"
