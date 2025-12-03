#!/bin/bash

# ════════════════════════════════════════════════════════════════════════════════
# Buscador JSON - Environment Validation Script
# ════════════════════════════════════════════════════════════════════════════════
# Validates environment variables and system requirements before deployment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# Variables
ERRORS=0
WARNINGS=0
SUCCESS=0

# ─── Helper Functions ───────────────────────────────────────────────────────

log_success() {
    echo -e "${GREEN}✓${NC} $1"
    ((SUCCESS++))
}

log_error() {
    echo -e "${RED}✗${NC} $1"
    ((ERRORS++))
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

log_info() {
    echo -e "${BLUE}→${NC} $1"
}

print_section() {
    echo ""
    echo -e "${BOLD}${BLUE}═══ $1 ═══${NC}"
    echo ""
}

print_summary() {
    echo ""
    echo -e "${BOLD}${BLUE}═══════════════════════════════════════════${NC}"
    echo -e "${BOLD}Validation Summary${NC}"
    echo -e "${BOLD}${BLUE}═══════════════════════════════════════════${NC}"
    echo -e "✓ Passed: ${GREEN}${SUCCESS}${NC}"
    echo -e "⚠ Warnings: ${YELLOW}${WARNINGS}${NC}"
    echo -e "✗ Errors: ${RED}${ERRORS}${NC}"
    echo -e "${BOLD}${BLUE}═══════════════════════════════════════════${NC}"
    echo ""
}

# ─── Validation Functions ───────────────────────────────────────────────────

check_env_file() {
    print_section "Environment File"
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            log_warning ".env not found, using .env.example as template"
            cp .env.example .env
            log_success "Created .env from .env.example"
        else
            log_error ".env file not found and .env.example not available"
            return 1
        fi
    else
        log_success ".env file exists"
    fi
}

check_env_variables() {
    print_section "Required Environment Variables"
    
    # Source .env file
    set -a
    [ -f .env ] && . .env
    set +a
    
    local required_vars=(
        "NEXT_PUBLIC_API_URL"
        "NODE_ENV"
        "FLASK_ENV"
        "ALLOWED_ORIGINS"
        "MAX_UPLOAD_SIZE"
        "DATABASE_URL"
        "UPLOAD_DIR"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "Missing required variable: $var"
        else
            log_success "$var is set: ${!var}"
        fi
    done
}

check_ports() {
    print_section "Port Availability"
    
    local ports=(3000 4000 8080)
    
    for port in "${ports[@]}"; do
        if command -v lsof &> /dev/null; then
            if lsof -i :$port &> /dev/null; then
                log_warning "Port $port is already in use"
            else
                log_success "Port $port is available"
            fi
        elif command -v ss &> /dev/null; then
            if ss -tlnp 2>/dev/null | grep -q ":$port "; then
                log_warning "Port $port is already in use"
            else
                log_success "Port $port is available"
            fi
        else
            log_warning "Cannot check port $port (lsof or ss not available)"
        fi
    done
}

check_directories() {
    print_section "Directory Structure"
    
    local dirs=("uploads" "data" "node_modules" "public" "app")
    
    for dir in "${dirs[@]}"; do
        if [ -d "$dir" ]; then
            log_success "Directory exists: $dir"
        else
            if [ "$dir" = "uploads" ] || [ "$dir" = "data" ] || [ "$dir" = "node_modules" ]; then
                log_warning "Directory not found (will be created): $dir"
                mkdir -p "$dir"
            else
                log_error "Required directory not found: $dir"
            fi
        fi
    done
}

check_files() {
    print_section "Required Files"
    
    local files=(
        "package.json"
        "tsconfig.json"
        "next.config.mjs"
        "tailwind.config.cjs"
        "requirements.txt"
        "server_api.py"
        "docker-compose.yml"
        "Dockerfile.frontend"
        "Dockerfile.backend"
    )
    
    for file in "${files[@]}"; do
        if [ -f "$file" ]; then
            log_success "File exists: $file"
        else
            log_error "Required file not found: $file"
        fi
    done
}

check_node_version() {
    print_section "Node.js & npm"
    
    if command -v node &> /dev/null; then
        local node_version=$(node --version)
        log_success "Node.js installed: $node_version"
        
        # Check version is 16+
        local major_version=$(echo $node_version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$major_version" -lt 16 ]; then
            log_warning "Node.js version $major_version is older than recommended (16+)"
        fi
    else
        log_error "Node.js is not installed"
    fi
    
    if command -v npm &> /dev/null; then
        local npm_version=$(npm --version)
        log_success "npm installed: $npm_version"
    else
        log_error "npm is not installed"
    fi
    
    if command -v pnpm &> /dev/null; then
        local pnpm_version=$(pnpm --version)
        log_success "pnpm installed: $pnpm_version"
    else
        log_warning "pnpm is not installed (required for dependencies)"
    fi
}

check_python_version() {
    print_section "Python"
    
    if command -v python3 &> /dev/null; then
        local python_version=$(python3 --version 2>&1)
        log_success "Python3 installed: $python_version"
        
        # Check version is 3.8+
        local major=$(echo $python_version | cut -d' ' -f2 | cut -d'.' -f1)
        local minor=$(echo $python_version | cut -d' ' -f2 | cut -d'.' -f2)
        
        if [ "$major" -lt 3 ] || ([ "$major" -eq 3 ] && [ "$minor" -lt 8 ]); then
            log_warning "Python version is older than recommended (3.8+)"
        fi
    elif command -v python &> /dev/null; then
        local python_version=$(python --version 2>&1)
        log_success "Python installed: $python_version"
    else
        log_error "Python is not installed"
    fi
}

check_dependencies() {
    print_section "Node Dependencies"
    
    if [ -d "node_modules" ]; then
        log_success "node_modules directory exists"
        
        if [ -f "package-lock.json" ] || [ -f "pnpm-lock.yaml" ]; then
            log_success "Lock file exists (pnpm-lock.yaml or package-lock.json)"
        else
            log_warning "Lock file not found - dependencies may be inconsistent"
        fi
    else
        log_warning "node_modules not found - run 'pnpm install' or 'npm install'"
    fi
    
    print_section "Python Dependencies"
    
    if [ -f "requirements.txt" ]; then
        log_success "requirements.txt exists"
        
        if command -v pip3 &> /dev/null; then
            # Check if main dependencies are installed
            local required_packages=("flask" "flask-cors" "python-dotenv")
            for pkg in "${required_packages[@]}"; do
                if pip3 show "$pkg" &> /dev/null; then
                    log_success "Python package installed: $pkg"
                else
                    log_warning "Python package not installed: $pkg"
                fi
            done
        else
            log_warning "pip3 not found - cannot check Python packages"
        fi
    else
        log_error "requirements.txt not found"
    fi
}

check_docker() {
    print_section "Docker"
    
    if command -v docker &> /dev/null; then
        local docker_version=$(docker --version)
        log_success "Docker installed: $docker_version"
    else
        log_error "Docker is not installed"
    fi
    
    if command -v docker-compose &> /dev/null; then
        local compose_version=$(docker-compose --version)
        log_success "Docker Compose installed: $compose_version"
    else
        log_warning "Docker Compose is not installed (may be integrated with Docker)"
    fi
    
    if docker ps &> /dev/null; then
        log_success "Docker daemon is running"
    else
        log_error "Docker daemon is not running"
    fi
}

check_configuration() {
    print_section "Configuration Values"
    
    set -a
    [ -f .env ] && . .env
    set +a
    
    # Check API URL
    if [ -n "$NEXT_PUBLIC_API_URL" ]; then
        case "$NEXT_PUBLIC_API_URL" in
            http://*)
                log_success "API URL: $NEXT_PUBLIC_API_URL"
                ;;
            https://*)
                log_success "API URL (HTTPS): $NEXT_PUBLIC_API_URL"
                ;;
            *)
                log_error "Invalid API URL format: $NEXT_PUBLIC_API_URL"
                ;;
        esac
    fi
    
    # Check NODE_ENV
    if [ "$NODE_ENV" = "production" ] || [ "$NODE_ENV" = "development" ]; then
        log_success "NODE_ENV is set to: $NODE_ENV"
    else
        log_warning "NODE_ENV has unusual value: $NODE_ENV"
    fi
    
    # Check FLASK_ENV
    if [ "$FLASK_ENV" = "production" ] || [ "$FLASK_ENV" = "development" ]; then
        log_success "FLASK_ENV is set to: $FLASK_ENV"
    else
        log_warning "FLASK_ENV has unusual value: $FLASK_ENV"
    fi
    
    # Check upload size
    if [ -n "$MAX_UPLOAD_SIZE" ]; then
        local size_mb=$((MAX_UPLOAD_SIZE / 1048576))
        log_success "MAX_UPLOAD_SIZE: ${size_mb}MB"
        
        if [ "$size_mb" -gt 500 ]; then
            log_warning "MAX_UPLOAD_SIZE is very large (${size_mb}MB) - ensure sufficient memory"
        fi
    fi
}

check_disk_space() {
    print_section "Disk Space"
    
    if command -v df &> /dev/null; then
        local available=$(df . | awk 'NR==2 {print $4}')
        local available_gb=$((available / 1024 / 1024))
        
        if [ "$available_gb" -lt 10 ]; then
            log_warning "Limited disk space available: ${available_gb}GB (recommended: 10GB+)"
        else
            log_success "Sufficient disk space available: ${available_gb}GB"
        fi
    else
        log_warning "Cannot check disk space (df not available)"
    fi
}

# ─── Main Execution ────────────────────────────────────────────────────────

echo -e "${BLUE}${BOLD}"
echo "╔═════════════════════════════════════════════╗"
echo "║  Buscador JSON - Environment Validator     ║"
echo "╚═════════════════════════════════════════════╝"
echo -e "${NC}"

check_env_file
check_env_variables
check_ports
check_directories
check_files
check_node_version
check_python_version
check_dependencies
check_docker
check_configuration
check_disk_space

print_summary

# Exit with error if there are critical errors
if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}${BOLD}Critical errors found. Please fix before proceeding.${NC}"
    exit 1
fi

if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}${BOLD}Warnings found. Review before deployment.${NC}"
    exit 0
fi

echo -e "${GREEN}${BOLD}✓ All validations passed!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Run: ${BOLD}pnpm install${NC} (or npm install)"
echo "  2. Run: ${BOLD}pip3 install -r requirements.txt${NC}"
echo "  3. Run: ${BOLD}docker-compose build${NC}"
echo "  4. Run: ${BOLD}docker-compose up -d${NC}"
echo ""

exit 0
