# Makefile for LSH (Extensible CLI Client)
# =============================================================================
# CONFIGURATION
# =============================================================================

# Project information
PROJECT_NAME := lsh
VERSION := 0.0.0
NODE_MODULES := node_modules
PACKAGE_JSON := package.json

# Directories
SRC_DIR := src
DIST_DIR := dist
BUILD_DIR := build
BIN_DIR := bin
TYPES_DIR := types
TEST_DIR := __tests__
SCRIPTS_DIR := scripts
SERVICE_DIR := service

# Node.js and build tools
NPM := npm
NODE := node
TSC := npx tsc
JEST := $(NODE) --experimental-vm-modules ./$(NODE_MODULES)/.bin/jest
NEXE := $(NODE) scripts/build.js

# Build outputs
MAIN_OUTPUT := $(DIST_DIR)/app.js
BINARY_OUTPUT := lsh
DAEMON_SCRIPT := $(SCRIPTS_DIR)/install-daemon.sh
UNINSTALL_SCRIPT := $(SCRIPTS_DIR)/uninstall.sh

# ANSI color codes for prettier output
CYAN := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
RESET := \033[0m

# =============================================================================
# UTILITY TARGETS
# =============================================================================

.PHONY: help
help: ## Show this help message
	@echo -e "$(CYAN)LSH Build System$(RESET)"
	@echo -e "$(YELLOW)Usage: make [target]$(RESET)"
	@echo -e ""
	@echo -e "$(CYAN)Setup Targets:$(RESET)"
	@echo -e "  $(GREEN)install$(RESET)              Install Node.js dependencies"
	@echo -e "  $(GREEN)setup$(RESET)                Complete setup (install dependencies)"
	@echo -e ""
	@echo -e "$(CYAN)System Installation:$(RESET)"
	@echo -e "  $(GREEN)install-system$(RESET)       Install LSH binary to system PATH"
	@echo -e "  $(GREEN)uninstall-system$(RESET)     Remove LSH binary from system PATH"
	@echo -e "  $(GREEN)reinstall-system$(RESET)     Reinstall LSH binary to system PATH"
	@echo -e ""
	@echo -e "$(CYAN)Complete Installation:$(RESET)"
	@echo -e "  $(GREEN)install-full$(RESET)         Install LSH binary + daemon service"
	@echo -e "  $(GREEN)uninstall-full$(RESET)       Complete uninstall (binary + daemon)"
	@echo -e ""
	@echo -e "$(CYAN)Build Targets:$(RESET)"
	@echo -e "  $(GREEN)compile$(RESET)              Compile TypeScript to JavaScript"
	@echo -e "  $(GREEN)compile-watch$(RESET)        Compile TypeScript in watch mode"
	@echo -e "  $(GREEN)build$(RESET)                Full build (clean + compile + binary)"
	@echo -e "  $(GREEN)build-binary$(RESET)         Build executable binary"
	@echo -e "  $(GREEN)quick-build$(RESET)          Quick build (compile only)"
	@echo -e ""
	@echo -e "$(CYAN)Development Targets:$(RESET)"
	@echo -e "  $(GREEN)start$(RESET)                Start the application"
	@echo -e "  $(GREEN)dev$(RESET)                  Start in development mode (compile + start)"
	@echo -e "  $(GREEN)watch$(RESET)                Watch for changes and recompile"
	@echo -e ""
	@echo -e "$(CYAN)Testing Targets:$(RESET)"
	@echo -e "  $(GREEN)test$(RESET)                 Run all tests"
	@echo -e "  $(GREEN)test-watch$(RESET)           Run tests in watch mode"
	@echo -e "  $(GREEN)test-coverage$(RESET)        Run tests with coverage report"
	@echo -e ""
	@echo -e "$(CYAN)Service Management:$(RESET)"
	@echo -e "  $(GREEN)install-daemon$(RESET)       Install LSHD as system service"
	@echo -e "  $(GREEN)daemon-status$(RESET)        Check daemon status"
	@echo -e "  $(GREEN)daemon-start$(RESET)         Start the daemon service"
	@echo -e "  $(GREEN)daemon-stop$(RESET)          Stop the daemon service"
	@echo -e "  $(GREEN)daemon-restart$(RESET)       Restart the daemon service"
	@echo -e ""
	@echo -e "$(CYAN)ML Dashboard:$(RESET)"
	@echo -e "  $(GREEN)dashboard$(RESET)            Start ML dashboard (LSH + MCLI)"
	@echo -e "  $(GREEN)dashboard-services$(RESET)   Start backend services only"
	@echo -e "  $(GREEN)dashboard-ui$(RESET)         Launch ML dashboard UI"
	@echo -e "  $(GREEN)dashboard-status$(RESET)     Check dashboard services status"
	@echo -e "  $(GREEN)dashboard-stop$(RESET)       Stop all dashboard services"
	@echo -e "  $(GREEN)dashboard-restart$(RESET)    Restart all dashboard services"
	@echo -e "  $(GREEN)dashboard-logs$(RESET)       View dashboard service logs"
	@echo -e "  $(GREEN)dashboard-info$(RESET)       Show dashboard URLs and info"
	@echo -e ""
	@echo -e "$(CYAN)Maintenance Targets:$(RESET)"
	@echo -e "  $(GREEN)clean$(RESET)                Clean all build artifacts"
	@echo -e "  $(GREEN)clean-all$(RESET)            Clean everything including node_modules"
	@echo -e "  $(GREEN)lint$(RESET)                 Run linter (if configured)"
	@echo -e "  $(GREEN)format$(RESET)               Format code (if configured)"
	@echo -e ""
	@echo -e "$(CYAN)Utility Targets:$(RESET)"
	@echo -e "  $(GREEN)check-deps$(RESET)           Check for outdated dependencies"
	@echo -e "  $(GREEN)audit$(RESET)                Run security audit"
	@echo -e "  $(GREEN)info$(RESET)                 Show project information"

.PHONY: info
info: ## Show project information
	@echo -e "$(CYAN)Project Information:$(RESET)"
	@echo -e "Project: $(PROJECT_NAME)"
	@echo -e "Version: $(VERSION)"
	@echo -e "Node.js: $$($(NODE) --version 2>/dev/null || echo 'Not installed')"
	@echo -e "npm: $$($(NPM) --version 2>/dev/null || echo 'Not installed')"
	@echo -e "TypeScript: $$($(TSC) --version 2>/dev/null || echo 'Not installed')"
	@echo -e "Build outputs:"
	@echo -e "  - Main JS: $(MAIN_OUTPUT)"
	@echo -e "  - Binary: $(BINARY_OUTPUT)"
	@echo -e "  - Types: $(TYPES_DIR)"

# =============================================================================
# SETUP TARGETS
# =============================================================================

.PHONY: install
install: ## Install Node.js dependencies
	@echo -e "$(CYAN)Installing dependencies...$(RESET)"
	$(NPM) install
	@echo -e "$(GREEN)Dependencies installed ✅$(RESET)"

.PHONY: setup
setup: install ## Complete setup (install dependencies)
	@echo -e "$(GREEN)Setup completed ✅$(RESET)"

# =============================================================================
# BUILD TARGETS
# =============================================================================

$(DIST_DIR):
	@mkdir -p $(DIST_DIR)

$(TYPES_DIR):
	@mkdir -p $(TYPES_DIR)

.PHONY: compile
compile: $(DIST_DIR) $(TYPES_DIR) ## Compile TypeScript to JavaScript
	@echo -e "$(CYAN)Compiling TypeScript...$(RESET)"
	$(TSC) -b
	@echo -e "$(GREEN)TypeScript compilation completed ✅$(RESET)"

.PHONY: compile-watch
compile-watch: ## Compile TypeScript in watch mode
	@echo -e "$(CYAN)Starting TypeScript compiler in watch mode...$(RESET)"
	$(TSC) --watch

.PHONY: build-binary
build-binary: compile ## Build executable binary
	@echo -e "$(CYAN)Building executable binary...$(RESET)"
	$(NEXE)
	@if [ -f "$(BINARY_OUTPUT)" ]; then \
		echo "$(GREEN)Binary built successfully: $(BINARY_OUTPUT) ✅$(RESET)"; \
		ls -lh $(BINARY_OUTPUT); \
	else \
		echo "$(RED)❌ Binary build failed$(RESET)"; \
		exit 1; \
	fi

.PHONY: quick-build
quick-build: compile ## Quick build (compile only)
	@echo -e "$(GREEN)Quick build completed ✅$(RESET)"

.PHONY: build
build: clean compile build-binary ## Full build (clean + compile + binary)
	@echo -e "$(GREEN)Full build completed ✅$(RESET)"

# =============================================================================
# DEVELOPMENT TARGETS
# =============================================================================

.PHONY: start
start: $(MAIN_OUTPUT) ## Start the application
	@echo -e "$(CYAN)Starting application...$(RESET)"
	$(NODE) $(MAIN_OUTPUT)

.PHONY: dev
dev: compile start ## Start in development mode (compile + start)

.PHONY: watch
watch: compile-watch ## Watch for changes and recompile (alias for compile-watch)

# =============================================================================
# TESTING TARGETS
# =============================================================================

.PHONY: test
test: ## Run all tests
	@echo -e "$(CYAN)Running tests...$(RESET)"
	$(JEST)
	@echo -e "$(GREEN)Tests completed ✅$(RESET)"

.PHONY: test-watch
test-watch: ## Run tests in watch mode
	@echo -e "$(CYAN)Running tests in watch mode...$(RESET)"
	$(JEST) --watch

.PHONY: test-coverage
test-coverage: ## Run tests with coverage report
	@echo -e "$(CYAN)Running tests with coverage...$(RESET)"
	$(JEST) --coverage
	@echo -e "$(GREEN)Coverage report generated ✅$(RESET)"

# =============================================================================
# SYSTEM INSTALLATION TARGETS
# =============================================================================

# System binary directory (adjustable per OS)
ifeq ($(shell uname),Darwin)
    SYS_BIN_DIR := /usr/local/bin
else ifeq ($(shell uname),Linux)
    SYS_BIN_DIR := /usr/local/bin
else
    SYS_BIN_DIR := /usr/local/bin
endif

.PHONY: install-system
install-system: ## Install LSH binary to system PATH (includes clean + compile + binary)
	@echo -e "$(CYAN)Removing any root-owned build artifacts...$(RESET)"
	@sudo rm -rf dist types lsh 2>/dev/null || true
	@rm -rf dist types lsh *.tsbuildinfo 2>/dev/null || true
	@find . -name "*.tsbuildinfo" -delete 2>/dev/null || true
	@$(MAKE) build
	@echo -e "$(CYAN)Installing LSH binary to system...$(RESET)"
	@if [ ! -f "$(BINARY_OUTPUT)" ]; then \
		echo "$(RED)❌ Binary not found. Run 'make build-binary' first$(RESET)"; \
		exit 1; \
	fi
	@echo -e "Creating LSH system directory..."
	sudo mkdir -p /usr/local/lib/lsh
	@echo -e "Removing old dist files..."
	sudo rm -rf /usr/local/lib/lsh/dist
	@echo -e "Copying LSH files..."
	sudo cp -r dist /usr/local/lib/lsh/
	sudo cp -r node_modules /usr/local/lib/lsh/
	sudo cp package.json /usr/local/lib/lsh/
	@echo -e "Installing wrapper script to $(SYS_BIN_DIR)/$(PROJECT_NAME)"
	sudo cp "$(BINARY_OUTPUT)" "$(SYS_BIN_DIR)/$(PROJECT_NAME)"
	sudo chmod +x "$(SYS_BIN_DIR)/$(PROJECT_NAME)"
	@echo -e "$(GREEN)LSH installed to $(SYS_BIN_DIR)/$(PROJECT_NAME) ✅$(RESET)"
	@echo -e ""
	@echo -e "$(CYAN)Verification:$(RESET)"
	@if command -v $(PROJECT_NAME) >/dev/null 2>&1; then \
		echo "$(GREEN)✅ LSH is available in PATH$(RESET)"; \
		echo "Try: $(YELLOW)$(PROJECT_NAME) --help$(RESET)"; \
	else \
		echo "$(YELLOW)⚠️  LSH may not be in PATH. Try: $(SYS_BIN_DIR)/$(PROJECT_NAME)$(RESET)"; \
	fi

.PHONY: uninstall-system
uninstall-system: ## Remove LSH binary from system PATH
	@echo -e "$(CYAN)Uninstalling LSH binary from system...$(RESET)"
	@if [ -f "$(SYS_BIN_DIR)/$(PROJECT_NAME)" ]; then \
		sudo rm -f "$(SYS_BIN_DIR)/$(PROJECT_NAME)"; \
		echo "$(GREEN)LSH binary removed from $(SYS_BIN_DIR)/$(PROJECT_NAME) ✅$(RESET)"; \
	else \
		echo "$(YELLOW)LSH binary not found in $(SYS_BIN_DIR)/$(PROJECT_NAME)$(RESET)"; \
	fi
	@if [ -d "/usr/local/lib/lsh" ]; then \
		sudo rm -rf /usr/local/lib/lsh; \
		echo "$(GREEN)LSH library files removed from /usr/local/lib/lsh ✅$(RESET)"; \
	else \
		echo "$(YELLOW)LSH library directory not found$(RESET)"; \
	fi
	@if ! command -v $(PROJECT_NAME) >/dev/null 2>&1; then \
		echo "$(GREEN)✅ LSH successfully removed from PATH$(RESET)"; \
	else \
		echo "$(YELLOW)⚠️  LSH may still be available from another location$(RESET)"; \
	fi

.PHONY: reinstall-system
reinstall-system: uninstall-system install-system ## Reinstall LSH binary to system PATH
	@echo -e "$(GREEN)LSH reinstallation completed ✅$(RESET)"

# =============================================================================
# COMPLETE INSTALLATION TARGETS
# =============================================================================

.PHONY: install-full
install-full: ## Install LSH binary and daemon service (includes clean + compile + binary)
	@echo -e "$(CYAN)Removing any root-owned build artifacts...$(RESET)"
	@sudo rm -rf dist types lsh 2>/dev/null || true
	@rm -rf dist types lsh *.tsbuildinfo 2>/dev/null || true
	@find . -name "*.tsbuildinfo" -delete 2>/dev/null || true
	@$(MAKE) compile build-binary
	@echo -e "$(CYAN)Installing LSH binary to system...$(RESET)"
	@if [ ! -f "$(BINARY_OUTPUT)" ]; then \
		echo "$(RED)❌ Binary not found$(RESET)"; \
		exit 1; \
	fi
	@echo -e "Creating LSH system directory..."
	sudo mkdir -p /usr/local/lib/lsh
	@echo -e "Removing old dist files..."
	sudo rm -rf /usr/local/lib/lsh/dist
	@echo -e "Copying LSH files..."
	sudo cp -r dist /usr/local/lib/lsh/
	sudo cp -r node_modules /usr/local/lib/lsh/
	sudo cp package.json /usr/local/lib/lsh/
	@echo -e "Installing wrapper script to $(SYS_BIN_DIR)/$(PROJECT_NAME)"
	sudo cp "$(BINARY_OUTPUT)" "$(SYS_BIN_DIR)/$(PROJECT_NAME)"
	sudo chmod +x "$(SYS_BIN_DIR)/$(PROJECT_NAME)"
	@echo -e "$(GREEN)LSH installed to $(SYS_BIN_DIR)/$(PROJECT_NAME) ✅$(RESET)"
	@echo -e ""
	@echo -e "$(CYAN)Verification:$(RESET)"
	@if command -v $(PROJECT_NAME) >/dev/null 2>&1; then \
		echo "$(GREEN)✅ LSH is available in PATH$(RESET)"; \
		echo "Try: $(YELLOW)$(PROJECT_NAME) --help$(RESET)"; \
	else \
		echo "$(YELLOW)⚠️  LSH may not be in PATH. Try: $(SYS_BIN_DIR)/$(PROJECT_NAME)$(RESET)"; \
	fi
	@echo -e "$(CYAN)Installing LSHD...$(RESET)"
	@if [ ! -f "$(DAEMON_SCRIPT)" ]; then \
		echo "$(RED)❌ Daemon installation script not found: $(DAEMON_SCRIPT)$(RESET)"; \
		exit 1; \
	fi
	@if [ ! -f "$(MAIN_OUTPUT)" ]; then \
		echo "$(RED)❌ Application not built$(RESET)"; \
		exit 1; \
	fi
	sudo bash $(DAEMON_SCRIPT)
	@echo -e "$(GREEN)Daemon installation completed ✅$(RESET)"
	@echo -e "$(GREEN)LSH complete installation completed ✅$(RESET)"

.PHONY: uninstall-full
uninstall-full: ## Complete uninstall (binary + daemon)
	@echo -e "$(CYAN)Uninstalling LSH completely...$(RESET)"
	@if [ ! -f "$(UNINSTALL_SCRIPT)" ]; then \
		echo "$(RED)❌ Uninstall script not found: $(UNINSTALL_SCRIPT)$(RESET)"; \
		exit 1; \
	fi
	sudo bash $(UNINSTALL_SCRIPT)
	@echo -e "$(GREEN)Complete uninstall completed ✅$(RESET)"

# =============================================================================
# SERVICE MANAGEMENT TARGETS
# =============================================================================

.PHONY: install-daemon
install-daemon: build ## Install LSHD as system service
	@echo -e "$(CYAN)Installing LSHD...$(RESET)"
	@if [ ! -f "$(DAEMON_SCRIPT)" ]; then \
		echo "$(RED)❌ Daemon installation script not found: $(DAEMON_SCRIPT)$(RESET)"; \
		exit 1; \
	fi
	@if [ ! -f "$(MAIN_OUTPUT)" ]; then \
		echo "$(RED)❌ Application not built. Run 'make build' first$(RESET)"; \
		exit 1; \
	fi
	sudo bash $(DAEMON_SCRIPT)
	@echo -e "$(GREEN)Daemon installation completed ✅$(RESET)"

.PHONY: daemon-status
daemon-status: ## Check daemon status
	@echo -e "$(CYAN)Checking daemon status...$(RESET)"
	@if command -v lshd >/dev/null 2>&1; then \
		lshd status; \
	else \
		echo "$(YELLOW)Daemon not installed. Use 'make install-daemon' to install.$(RESET)"; \
	fi

.PHONY: daemon-start
daemon-start: ## Start the daemon service
	@echo -e "$(CYAN)Starting daemon...$(RESET)"
	@if command -v lshd >/dev/null 2>&1; then \
		lshd start; \
		echo "$(GREEN)Daemon started ✅$(RESET)"; \
	else \
		echo "$(YELLOW)Daemon not installed. Use 'make install-daemon' to install.$(RESET)"; \
	fi

.PHONY: daemon-stop
daemon-stop: ## Stop the daemon service
	@echo -e "$(CYAN)Stopping daemon...$(RESET)"
	@if command -v lshd >/dev/null 2>&1; then \
		lshd stop; \
		echo "$(GREEN)Daemon stopped ✅$(RESET)"; \
	else \
		echo "$(YELLOW)Daemon not installed.$(RESET)"; \
	fi

.PHONY: daemon-restart
daemon-restart: ## Restart the daemon service
	@echo -e "$(CYAN)Restarting daemon...$(RESET)"
	@if command -v lshd >/dev/null 2>&1; then \
		lshd restart; \
		echo "$(GREEN)Daemon restarted ✅$(RESET)"; \
	else \
		echo "$(YELLOW)Daemon not installed. Use 'make install-daemon' to install.$(RESET)"; \
	fi

.PHONY: daemon-cleanup
daemon-cleanup: ## Clean up all daemon processes and files
	@echo -e "$(CYAN)Cleaning up LSH daemon...$(RESET)"
	@echo -e "$(YELLOW)Killing all daemon processes...$(RESET)"
	@sudo pkill -f "lshd.js" 2>/dev/null || echo "No daemon processes found"
	@sleep 2
	@echo -e "$(YELLOW)Removing socket files...$(RESET)"
	@sudo rm -f /tmp/lsh-*daemon*.sock 2>/dev/null || true
	@echo -e "$(YELLOW)Removing PID files...$(RESET)"
	@sudo rm -f /tmp/lsh-*daemon*.pid 2>/dev/null || true
	@echo -e "$(YELLOW)Verifying cleanup...$(RESET)"
	@if pgrep -f "lshd.js" >/dev/null 2>&1; then \
		echo "$(RED)⚠️  Some daemon processes may still be running$(RESET)"; \
		echo "$(YELLOW)Attempting force kill...$(RESET)"; \
		sudo kill -9 $$(pgrep -f "lshd.js") 2>/dev/null || true; \
		sleep 1; \
	fi
	@if ls /tmp/lsh-*daemon*.sock /tmp/lsh-*daemon*.pid >/dev/null 2>&1; then \
		echo "$(RED)⚠️  Some daemon files may still exist$(RESET)"; \
		sudo rm -f /tmp/lsh-*daemon*.sock /tmp/lsh-*daemon*.pid 2>/dev/null || true; \
	fi
	@echo -e "$(GREEN)Daemon cleanup completed ✅$(RESET)"
	@echo -e ""
	@echo -e "$(CYAN)Next steps:$(RESET)"
	@echo -e "  $(YELLOW)Start daemon: sudo lsh daemon start$(RESET)"
	@echo -e "  $(YELLOW)Check status: sudo lsh daemon status$(RESET)"

.PHONY: daemon-reset
daemon-reset: daemon-cleanup ## Complete daemon reset (cleanup + restart)
	@echo -e "$(CYAN)Resetting daemon...$(RESET)"
	@sleep 2
	@echo -e "$(YELLOW)Starting fresh daemon...$(RESET)"
	@sudo lsh daemon start || echo "$(RED)Failed to start daemon - check logs$(RESET)"
	@sleep 3
	@echo -e "$(YELLOW)Checking daemon status...$(RESET)"
	@if sudo lsh daemon status >/dev/null 2>&1; then \
		echo "$(GREEN)✅ Daemon successfully reset and running!$(RESET)"; \
		sudo lsh daemon status; \
	else \
		echo "$(RED)❌ Daemon failed to start properly$(RESET)"; \
		echo "$(YELLOW)Check logs: tail -f /tmp/lsh-job-daemon*.log$(RESET)"; \
	fi

.PHONY: daemon-logs
daemon-logs: ## Show daemon logs
	@echo -e "$(CYAN)LSH Daemon Logs:$(RESET)"
	@echo -e ""
	@for log in $$(ls /tmp/lsh-*daemon*.log 2>/dev/null); do \
		echo "$(YELLOW)=== $$log ===$(RESET)"; \
		tail -20 "$$log" 2>/dev/null || echo "Cannot read $$log"; \
		echo ""; \
	done

.PHONY: daemon-debug
daemon-debug: ## Debug daemon issues
	@echo -e "$(CYAN)LSH Daemon Debug Information:$(RESET)"
	@echo -e ""
	@echo -e "$(YELLOW)1. Running processes:$(RESET)"
	@ps aux | grep lshd | grep -v grep || echo "No daemon processes found"
	@echo -e ""
	@echo -e "$(YELLOW)2. Socket files:$(RESET)"
	@ls -la /tmp/lsh-*daemon*.sock 2>/dev/null || echo "No socket files found"
	@echo -e ""
	@echo -e "$(YELLOW)3. PID files:$(RESET)"
	@ls -la /tmp/lsh-*daemon*.pid 2>/dev/null || echo "No PID files found"
	@echo -e ""
	@echo -e "$(YELLOW)4. Recent logs:$(RESET)"
	@for log in $$(ls /tmp/lsh-*daemon*.log 2>/dev/null | head -3); do \
		echo "$(CYAN)--- Last 5 lines of $$log ---$(RESET)"; \
		tail -5 "$$log" 2>/dev/null || echo "Cannot read $$log"; \
		echo ""; \
	done
	@echo -e "$(CYAN)Debug commands:$(RESET)"
	@echo -e "  $(YELLOW)make daemon-cleanup$(RESET)  - Clean up all daemon files"
	@echo -e "  $(YELLOW)make daemon-reset$(RESET)    - Complete daemon reset"
	@echo -e "  $(YELLOW)make daemon-logs$(RESET)     - View full daemon logs"

# =============================================================================
# ML DASHBOARD TARGETS
# =============================================================================

.PHONY: dashboard
dashboard: ## Start ML dashboard (LSH + MCLI integration)
	@echo -e "$(CYAN)╔════════════════════════════════════════╗$(RESET)"
	@echo -e "$(CYAN)║     ML Dashboard Quick Start          ║$(RESET)"
	@echo -e "$(CYAN)╚════════════════════════════════════════╝$(RESET)"
	@echo -e ""
	@./start-ml-dashboard.sh

.PHONY: dashboard-services
dashboard-services: ## Start dashboard backend services only (no UI)
	@echo -e "$(CYAN)Starting dashboard backend services...$(RESET)"
	@echo -e "$(YELLOW)[1/3] Starting LSH Daemon...$(RESET)"
	@lsh daemon status >/dev/null 2>&1 || lsh daemon start
	@echo -e "$(GREEN)✅ LSH Daemon running$(RESET)"
	@echo -e ""
	@echo -e "$(YELLOW)[2/3] Starting Pipeline Service...$(RESET)"
	@if ! lsof -i :3034 >/dev/null 2>&1; then \
		$(MAKE) compile; \
		nohup $(NODE) dist/pipeline/pipeline-service.js > /tmp/lsh-pipeline.log 2>&1 & \
		echo $$! > /tmp/lsh-pipeline.pid; \
		sleep 3; \
		if curl -s http://localhost:3034/api/health >/dev/null 2>&1; then \
			echo "$(GREEN)✅ Pipeline Service started (PID: $$(cat /tmp/lsh-pipeline.pid))$(RESET)"; \
		else \
			echo "$(RED)❌ Pipeline Service failed to start$(RESET)"; \
			exit 1; \
		fi \
	else \
		echo "$(GREEN)✅ Pipeline Service already running$(RESET)"; \
	fi
	@echo -e ""
	@echo -e "$(YELLOW)[3/3] Starting LSH API Server...$(RESET)"
	@if ! lsof -i :3030 >/dev/null 2>&1; then \
		export LSH_API_ENABLED=true LSH_API_PORT=3030; \
		lsh api start --port 3030 > /tmp/lsh-api.log 2>&1 & \
		sleep 2; \
		if lsof -i :3030 >/dev/null 2>&1; then \
			echo "$(GREEN)✅ API Server started$(RESET)"; \
		else \
			echo "$(YELLOW)⚠️  API Server may have failed$(RESET)"; \
		fi \
	else \
		echo "$(GREEN)✅ API Server already running$(RESET)"; \
	fi
	@echo -e ""
	@echo -e "$(GREEN)✅ All backend services running!$(RESET)"
	@echo -e ""
	@echo -e "$(CYAN)Service URLs:$(RESET)"
	@echo -e "  Pipeline: $(BLUE)http://localhost:3034/api/health$(RESET)"
	@echo -e "  API:      $(BLUE)http://localhost:3030/api/status$(RESET)"

.PHONY: dashboard-ui
dashboard-ui: ## Launch ML dashboard UI (requires services running)
	@echo -e "$(CYAN)Launching ML Dashboard UI...$(RESET)"
	@if ! command -v mcli >/dev/null 2>&1; then \
		echo "$(RED)❌ MCLI not found$(RESET)"; \
		echo "$(YELLOW)Install: cd ~/repos/mcli && uv sync --extra dashboard$(RESET)"; \
		exit 1; \
	fi
	@cd ~/repos/mcli && mcli workflow dashboard launch

.PHONY: dashboard-status
dashboard-status: ## Check dashboard services status
	@echo -e "$(CYAN)Dashboard Services Status:$(RESET)"
	@echo -e ""
	@echo -e "$(YELLOW)1. LSH Daemon:$(RESET)"
	@if lsh daemon status >/dev/null 2>&1; then \
		lsh daemon status; \
	else \
		echo "$(RED)❌ Not running$(RESET)"; \
	fi
	@echo -e ""
	@echo -e "$(YELLOW)2. Pipeline Service (port 3034):$(RESET)"
	@if lsof -i :3034 >/dev/null 2>&1; then \
		echo "$(GREEN)✅ Running$(RESET)"; \
		curl -s http://localhost:3034/api/health 2>/dev/null || echo "$(YELLOW)⚠️  Service not responding$(RESET)"; \
	else \
		echo "$(RED)❌ Not running$(RESET)"; \
	fi
	@echo -e ""
	@echo -e "$(YELLOW)3. LSH API Server (port 3030):$(RESET)"
	@if lsof -i :3030 >/dev/null 2>&1; then \
		echo "$(GREEN)✅ Running$(RESET)"; \
		curl -s http://localhost:3030/api/status 2>/dev/null || echo "$(YELLOW)⚠️  Service not responding$(RESET)"; \
	else \
		echo "$(RED)❌ Not running$(RESET)"; \
	fi
	@echo -e ""
	@echo -e "$(YELLOW)4. ML Dashboard (port 8501):$(RESET)"
	@if lsof -i :8501 >/dev/null 2>&1; then \
		echo "$(GREEN)✅ Running$(RESET)"; \
	else \
		echo "$(RED)❌ Not running$(RESET)"; \
	fi

.PHONY: dashboard-stop
dashboard-stop: ## Stop all dashboard services
	@echo -e "$(CYAN)Stopping dashboard services...$(RESET)"
	@echo -e "$(YELLOW)Stopping Pipeline Service...$(RESET)"
	@pkill -f "pipeline-service.js" 2>/dev/null && echo "$(GREEN)✅ Stopped$(RESET)" || echo "$(YELLOW)Not running$(RESET)"
	@echo -e "$(YELLOW)Stopping API Server...$(RESET)"
	@pkill -f "lsh api" 2>/dev/null && echo "$(GREEN)✅ Stopped$(RESET)" || echo "$(YELLOW)Not running$(RESET)"
	@echo -e "$(YELLOW)Stopping ML Dashboard...$(RESET)"
	@pkill -f "streamlit run" 2>/dev/null && echo "$(GREEN)✅ Stopped$(RESET)" || echo "$(YELLOW)Not running$(RESET)"
	@echo -e "$(GREEN)Dashboard services stopped$(RESET)"

.PHONY: dashboard-restart
dashboard-restart: dashboard-stop dashboard ## Restart all dashboard services
	@echo -e "$(GREEN)Dashboard restarted$(RESET)"

.PHONY: dashboard-logs
dashboard-logs: ## View dashboard service logs
	@echo -e "$(CYAN)Dashboard Service Logs:$(RESET)"
	@echo -e ""
	@echo -e "$(YELLOW)=== Pipeline Service ===$(RESET)"
	@tail -20 /tmp/lsh-pipeline.log 2>/dev/null || echo "No logs found"
	@echo -e ""
	@echo -e "$(YELLOW)=== API Server ===$(RESET)"
	@tail -20 /tmp/lsh-api.log 2>/dev/null || echo "No logs found"

.PHONY: dashboard-info
dashboard-info: ## Show dashboard information and URLs
	@echo -e "$(CYAN)╔════════════════════════════════════════╗$(RESET)"
	@echo -e "$(CYAN)║      ML Dashboard Information          ║$(RESET)"
	@echo -e "$(CYAN)╚════════════════════════════════════════╝$(RESET)"
	@echo -e ""
	@echo -e "$(GREEN)📊 Dashboard URLs:$(RESET)"
	@echo -e ""
	@echo -e "  $(CYAN)LSH Pipeline Dashboard:$(RESET)"
	@echo -e "    Hub:      $(BLUE)http://localhost:3034/hub$(RESET)"
	@echo -e "    Pipeline: $(BLUE)http://localhost:3034/dashboard/$(RESET)"
	@echo -e "    ML View:  $(BLUE)http://localhost:3034/ml/dashboard$(RESET)"
	@echo -e ""
	@echo -e "  $(CYAN)MCLI ML Dashboard:$(RESET)"
	@echo -e "    Streamlit: $(BLUE)http://localhost:8501$(RESET)"
	@echo -e ""
	@echo -e "  $(CYAN)LSH API:$(RESET)"
	@echo -e "    Status: $(BLUE)http://localhost:3030/api/status$(RESET)"
	@echo -e "    Jobs:   $(BLUE)http://localhost:3030/api/jobs$(RESET)"
	@echo -e ""
	@echo -e "$(GREEN)🚀 Quick Start:$(RESET)"
	@echo -e "  $(YELLOW)make dashboard$(RESET)         - Start everything"
	@echo -e "  $(YELLOW)make dashboard-status$(RESET)  - Check services"
	@echo -e "  $(YELLOW)make dashboard-stop$(RESET)    - Stop all services"
	@echo -e ""
	@echo -e "$(GREEN)📖 Documentation:$(RESET)"
	@echo -e "  Quick Start:  $(BLUE)DASHBOARD-QUICKSTART.md$(RESET)"
	@echo -e "  Full Guide:   $(BLUE)docs/ML-DASHBOARD-STARTUP.md$(RESET)"

# =============================================================================
# MAINTENANCE TARGETS
# =============================================================================

.PHONY: clean
clean: ## Clean all build artifacts
	@echo -e "$(CYAN)Cleaning build artifacts...$(RESET)"
	rm -rf $(DIST_DIR)
	rm -rf dist-binary
	rm -rf $(BUILD_DIR)
	rm -rf $(BIN_DIR)
	rm -rf $(TYPES_DIR)
	rm -f $(BINARY_OUTPUT)
	rm -f tsconfig.tsbuildinfo
	find . -name "*.tsbuildinfo" -delete 2>/dev/null || true
	@echo -e "$(GREEN)Clean completed ✅$(RESET)"

.PHONY: clean-all
clean-all: clean ## Clean everything including node_modules
	@echo -e "$(CYAN)Cleaning everything...$(RESET)"
	rm -rf $(NODE_MODULES)
	rm -f package-lock.json
	@echo -e "$(GREEN)Deep clean completed ✅$(RESET)"

.PHONY: lint
lint: ## Run linter (if configured)
	@echo -e "$(CYAN)Running linter...$(RESET)"
	@if $(NPM) run lint >/dev/null 2>&1; then \
		$(NPM) run lint; \
		echo "$(GREEN)Linting completed ✅$(RESET)"; \
	else \
		echo "$(YELLOW)No lint script configured in package.json$(RESET)"; \
	fi

.PHONY: format
format: ## Format code (if configured)
	@echo -e "$(CYAN)Formatting code...$(RESET)"
	@if $(NPM) run format >/dev/null 2>&1; then \
		$(NPM) run format; \
		echo "$(GREEN)Code formatting completed ✅$(RESET)"; \
	else \
		echo "$(YELLOW)No format script configured in package.json$(RESET)"; \
	fi

# =============================================================================
# UTILITY TARGETS
# =============================================================================

.PHONY: check-deps
check-deps: ## Check for outdated dependencies
	@echo -e "$(CYAN)Checking for outdated dependencies...$(RESET)"
	$(NPM) outdated || true

.PHONY: audit
audit: ## Run security audit
	@echo -e "$(CYAN)Running security audit...$(RESET)"
	$(NPM) audit
	@echo -e "$(GREEN)Security audit completed ✅$(RESET)"

# =============================================================================
# VALIDATION TARGETS
# =============================================================================

.PHONY: validate
validate: compile test ## Validate the project (compile + test)
	@echo -e "$(GREEN)Project validation completed ✅$(RESET)"

.PHONY: pre-commit
pre-commit: clean compile test ## Pre-commit validation
	@echo -e "$(GREEN)Pre-commit validation completed ✅$(RESET)"

# =============================================================================
# DEFAULT TARGET
# =============================================================================

.DEFAULT_GOAL := help

# Make sure required files exist
$(MAIN_OUTPUT): compile

# Dependencies
$(NODE_MODULES): $(PACKAGE_JSON)
	$(MAKE) install

# Conditional targets based on file existence
ifneq (,$(wildcard $(PACKAGE_JSON)))
install: $(NODE_MODULES)
endif