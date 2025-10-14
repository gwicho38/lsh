#!/bin/bash
# deploy.sh - Deploy LSH Daemon to fly.io
#
# This script automates the deployment of the LSH daemon to fly.io.
#
# Usage:
#   ./deploy.sh [options]
#
# Options:
#   --setup           Run initial setup (create app, set secrets)
#   --deploy-only     Only deploy (skip setup)
#   --test            Test deployment after deploy
#   --help            Show this help message
#
# Examples:
#   ./deploy.sh --setup          # First time deployment
#   ./deploy.sh --deploy-only    # Subsequent deployments
#   ./deploy.sh --test           # Deploy and test

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="mcli-lsh-daemon"
REGION="sjc"  # San Jose
DO_SETUP=false
DO_DEPLOY=true
DO_TEST=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --setup)
            DO_SETUP=true
            shift
            ;;
        --deploy-only)
            DO_SETUP=false
            shift
            ;;
        --test)
            DO_TEST=true
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --setup           Run initial setup (create app, set secrets)"
            echo "  --deploy-only     Only deploy (skip setup)"
            echo "  --test            Test deployment after deploy"
            echo "  --help            Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Helper functions
print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"

    # Check if fly CLI is installed
    if ! command -v fly &> /dev/null; then
        print_error "fly CLI is not installed"
        echo "Install with: curl -L https://fly.io/install.sh | sh"
        exit 1
    fi
    print_success "fly CLI is installed"

    # Check if logged in to fly.io
    if ! fly auth whoami &> /dev/null; then
        print_error "Not logged in to fly.io"
        echo "Run: fly auth login"
        exit 1
    fi
    print_success "Logged in to fly.io"

    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    NODE_VERSION=$(node --version)
    print_success "Node.js installed: $NODE_VERSION"

    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        print_error "package.json not found"
        exit 1
    fi
    print_success "package.json found"

    # Check if Dockerfile exists
    if [ ! -f "Dockerfile" ]; then
        print_error "Dockerfile not found"
        exit 1
    fi
    print_success "Dockerfile found"

    # Check if fly.toml exists
    if [ ! -f "fly.toml" ]; then
        print_error "fly.toml not found"
        exit 1
    fi
    print_success "fly.toml found"
}

# Build TypeScript locally to verify
build_locally() {
    print_header "Building TypeScript"

    print_info "Running npm install..."
    npm install

    print_info "Building TypeScript..."
    npm run build

    if [ ! -d "dist" ]; then
        print_error "Build failed - dist directory not created"
        exit 1
    fi

    print_success "TypeScript build successful"
}

# Create fly.io app
create_app() {
    print_header "Creating fly.io App"

    if fly apps list | grep -q "$APP_NAME"; then
        print_warning "App $APP_NAME already exists"
        return 0
    fi

    print_info "Creating app: $APP_NAME"
    fly apps create "$APP_NAME" --org personal || {
        print_error "Failed to create app"
        exit 1
    }

    print_success "App created: $APP_NAME"
}

# Set secrets
set_secrets() {
    print_header "Setting Secrets"

    if [ ! -f ".env" ]; then
        print_warning ".env file not found, skipping automatic secret setup"
        print_info "Set secrets manually with:"
        echo ""
        echo "  fly secrets set SUPABASE_URL=your_url -a $APP_NAME"
        echo "  fly secrets set SUPABASE_KEY=your_key -a $APP_NAME"
        echo "  fly secrets set LSH_API_KEY=\$(openssl rand -base64 32) -a $APP_NAME"
        echo ""
        return 0
    fi

    print_info "Reading secrets from .env file"

    # Extract secrets from .env
    SUPABASE_URL=$(grep "^SUPABASE_URL=" .env | cut -d'=' -f2-)
    SUPABASE_KEY=$(grep "^SUPABASE_KEY=" .env | cut -d'=' -f2-)
    LSH_API_KEY=$(grep "^LSH_API_KEY=" .env | cut -d'=' -f2-)

    # Set secrets
    if [ -n "$SUPABASE_URL" ]; then
        fly secrets set "SUPABASE_URL=$SUPABASE_URL" -a "$APP_NAME"
        print_success "SUPABASE_URL set"
    fi

    if [ -n "$SUPABASE_KEY" ]; then
        fly secrets set "SUPABASE_KEY=$SUPABASE_KEY" -a "$APP_NAME"
        print_success "SUPABASE_KEY set"
    fi

    if [ -n "$LSH_API_KEY" ]; then
        fly secrets set "LSH_API_KEY=$LSH_API_KEY" -a "$APP_NAME"
        print_success "LSH_API_KEY set"
    else
        # Generate random API key if not provided
        GENERATED_KEY=$(openssl rand -base64 32)
        fly secrets set "LSH_API_KEY=$GENERATED_KEY" -a "$APP_NAME"
        print_success "LSH_API_KEY generated and set"
        print_info "Save this key: $GENERATED_KEY"
    fi
}

# Deploy to fly.io
deploy() {
    print_header "Deploying to fly.io"

    print_info "Deploying app: $APP_NAME"
    fly deploy -a "$APP_NAME" || {
        print_error "Deployment failed"
        exit 1
    }

    print_success "Deployment successful"
}

# Test deployment
test_deployment() {
    print_header "Testing Deployment"

    APP_URL="https://${APP_NAME}.fly.dev"

    print_info "Testing health endpoint: ${APP_URL}/health"

    # Wait for deployment to be ready
    sleep 10

    # Test health endpoint
    HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "${APP_URL}/health" || echo "000")
    HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n 1)

    if [ "$HTTP_CODE" = "200" ]; then
        print_success "Health check passed"
        echo "$HEALTH_RESPONSE" | head -n -1
    else
        print_error "Health check failed (HTTP $HTTP_CODE)"
        print_info "Check logs with: fly logs -a $APP_NAME"
        exit 1
    fi

    # Test status endpoint
    print_info "Testing status endpoint: ${APP_URL}/api/status"
    STATUS_RESPONSE=$(curl -s "${APP_URL}/api/status" || echo "{}")
    if [ -n "$STATUS_RESPONSE" ]; then
        print_success "Status endpoint accessible"
        echo "$STATUS_RESPONSE"
    else
        print_warning "Status endpoint may not be available"
    fi
}

# Show post-deployment info
show_info() {
    print_header "Deployment Complete"

    APP_URL="https://${APP_NAME}.fly.dev"

    echo -e "${GREEN}🎉 LSH Daemon deployed successfully!${NC}"
    echo ""
    echo -e "${BLUE}App URL:${NC}      $APP_URL"
    echo -e "${BLUE}Health:${NC}       ${APP_URL}/health"
    echo -e "${BLUE}Status:${NC}       ${APP_URL}/api/status"
    echo -e "${BLUE}Jobs:${NC}         ${APP_URL}/api/jobs"
    echo ""
    echo -e "${BLUE}Useful commands:${NC}"
    echo "  View logs:       fly logs -a $APP_NAME"
    echo "  View status:     fly status -a $APP_NAME"
    echo "  SSH console:     fly ssh console -a $APP_NAME"
    echo "  Dashboard:       fly dashboard -a $APP_NAME"
    echo ""
    echo -e "${BLUE}Configure mcli:${NC}"
    echo "  export LSH_API_URL=$APP_URL"
    echo "  mcli lsh-status"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "  1. Test the API:     curl ${APP_URL}/health"
    echo "  2. Check logs:       fly logs -a $APP_NAME"
    echo "  3. Configure mcli:   mcli lsh-config --set-url ${APP_URL}"
    echo ""
}

# Main execution
main() {
    print_header "LSH Daemon Deployment"

    check_prerequisites

    if [ "$DO_SETUP" = true ]; then
        build_locally
        create_app
        set_secrets
    fi

    if [ "$DO_DEPLOY" = true ]; then
        deploy
    fi

    if [ "$DO_TEST" = true ]; then
        test_deployment
    fi

    show_info
}

# Run main function
main
