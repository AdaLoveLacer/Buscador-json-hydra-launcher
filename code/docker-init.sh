#!/bin/bash

# Docker Quick Start Script for Buscador JSON
# This script initializes and starts the Buscador JSON application using Docker Compose

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}  Buscador JSON - Docker Initialization${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}\n"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker is installed${NC}"

# Check if Docker daemon is running
if ! docker ps &> /dev/null; then
    echo -e "${RED}✗ Docker daemon is not running. Please start Docker.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker daemon is running${NC}\n"

# Create necessary directories
echo -e "${YELLOW}→ Creating necessary directories...${NC}"
mkdir -p uploads data

echo -e "${GREEN}✓ Directories created${NC}\n"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}→ Creating .env file from example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ .env file created (copied from .env.example)${NC}"
    else
        echo -e "${YELLOW}⚠ .env.example not found, creating minimal .env...${NC}"
        cat > .env << EOF
# Buscador JSON Environment Variables
NEXT_PUBLIC_API_URL=http://localhost:4000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4000
MAX_UPLOAD_SIZE=104857600
FLASK_ENV=production
NODE_ENV=production
EOF
        echo -e "${GREEN}✓ .env file created${NC}"
    fi
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

echo ""

# Build images
echo -e "${YELLOW}→ Building Docker images...${NC}"
docker-compose build --no-cache

echo -e "${GREEN}✓ Docker images built successfully${NC}\n"

# Start services
echo -e "${YELLOW}→ Starting services...${NC}"
docker-compose up -d

echo -e "${GREEN}✓ Services started${NC}\n"

# Wait for services to be healthy
echo -e "${YELLOW}→ Waiting for services to be ready...${NC}"
sleep 5

# Check service health
echo -e "${BLUE}Service Status:${NC}"
echo ""

if docker ps | grep -q buscador-json-backend; then
    echo -e "${GREEN}✓ Backend (Flask)${NC}: http://localhost:4000"
else
    echo -e "${RED}✗ Backend (Flask)${NC}: Failed to start"
fi

if docker ps | grep -q buscador-json-frontend; then
    echo -e "${GREEN}✓ Frontend (Next.js)${NC}: http://localhost:3000"
else
    echo -e "${RED}✗ Frontend (Next.js)${NC}: Failed to start"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}Buscador JSON is ready!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}\n"

echo -e "${YELLOW}Useful Commands:${NC}"
echo "  View logs:        ${BLUE}docker-compose logs -f${NC}"
echo "  Stop services:    ${BLUE}docker-compose down${NC}"
echo "  Rebuild images:   ${BLUE}docker-compose build --no-cache${NC}"
echo "  View containers:  ${BLUE}docker ps${NC}"
echo ""

echo -e "${YELLOW}Access URLs:${NC}"
echo "  Application:      ${BLUE}http://localhost:3000${NC}"
echo "  API:              ${BLUE}http://localhost:4000${NC}"
echo "  Database UI:      ${BLUE}http://localhost:8080 (docker-compose --profile debug up)${NC}"
echo ""
