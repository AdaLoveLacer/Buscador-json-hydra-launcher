# Docker Quick Start Script for Buscador JSON (Windows PowerShell)
# This script initializes and starts the Buscador JSON application using Docker Compose

param(
    [switch]$SkipBuild = $false,
    [switch]$DebugProfile = $false
)

# Colors for output
function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-Warning-Custom {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Message)
    Write-Host "→ $Message" -ForegroundColor Cyan
}

# Header
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Buscador JSON - Docker Initialization" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is installed
Write-Info "Checking Docker installation..."
try {
    $dockerVersion = docker --version
    Write-Success "Docker is installed: $dockerVersion"
} catch {
    Write-Error-Custom "Docker is not installed. Please install Docker Desktop."
    exit 1
}

# Check if Docker daemon is running
Write-Info "Checking Docker daemon..."
try {
    docker ps | Out-Null
    Write-Success "Docker daemon is running"
} catch {
    Write-Error-Custom "Docker daemon is not running. Please start Docker Desktop."
    exit 1
}

Write-Host ""

# Create necessary directories
Write-Info "Creating necessary directories..."
if (-not (Test-Path "uploads")) {
    New-Item -ItemType Directory -Path "uploads" | Out-Null
}
if (-not (Test-Path "data")) {
    New-Item -ItemType Directory -Path "data" | Out-Null
}
Write-Success "Directories created"

# Check if .env file exists
Write-Host ""
if (-not (Test-Path ".env")) {
    Write-Info "Creating .env file..."
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Success ".env file created (copied from .env.example)"
    } else {
        Write-Warning-Custom ".env.example not found, creating minimal .env..."
        $envContent = @"
# Buscador JSON Environment Variables
NEXT_PUBLIC_API_URL=http://localhost:4000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4000
MAX_UPLOAD_SIZE=104857600
FLASK_ENV=production
NODE_ENV=production
"@
        Set-Content -Path ".env" -Value $envContent
        Write-Success ".env file created"
    }
} else {
    Write-Success ".env file already exists"
}

Write-Host ""

# Build images (unless skipped)
if (-not $SkipBuild) {
    Write-Info "Building Docker images..."
    docker-compose build --no-cache
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Docker images built successfully"
    } else {
        Write-Error-Custom "Failed to build Docker images"
        exit 1
    }
} else {
    Write-Warning-Custom "Skipping image build as requested"
}

Write-Host ""

# Start services
Write-Info "Starting services..."
if ($DebugProfile) {
    docker-compose --profile debug up -d
} else {
    docker-compose up -d
}

if ($LASTEXITCODE -eq 0) {
    Write-Success "Services started"
} else {
    Write-Error-Custom "Failed to start services"
    exit 1
}

Write-Host ""

# Wait for services to be healthy
Write-Info "Waiting for services to be ready..."
Start-Sleep -Seconds 5

# Check service health
Write-Host "Service Status:" -ForegroundColor Cyan
Write-Host ""

if ($null -ne (docker ps --format "{{.Names}}" | Select-String "buscador-json-backend")) {
    Write-Success "Backend (Flask): http://localhost:4000"
} else {
    Write-Error-Custom "Backend (Flask): Failed to start"
}

if ($null -ne (docker ps --format "{{.Names}}" | Select-String "buscador-json-frontend")) {
    Write-Success "Frontend (Next.js): http://localhost:3000"
} else {
    Write-Error-Custom "Frontend (Next.js): Failed to start"
}

Write-Host ""
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Buscador JSON is ready!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "Useful Commands:" -ForegroundColor Yellow
Write-Host "  View logs:        docker-compose logs -f"
Write-Host "  Stop services:    docker-compose down"
Write-Host "  Rebuild images:   docker-compose build --no-cache"
Write-Host "  View containers:  docker ps"
Write-Host ""

Write-Host "Access URLs:" -ForegroundColor Yellow
Write-Host "  Application:      http://localhost:3000"
Write-Host "  API:              http://localhost:4000"
Write-Host "  Database UI:      http://localhost:8080 (with --DebugProfile)"
Write-Host ""
