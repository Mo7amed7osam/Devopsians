#!/bin/bash

# ===============================================
# Rollback Script - Revert to Previous Version
# ===============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo ""
echo "=========================================="
echo "  Devopsians Rollback Script"
echo "=========================================="
echo ""

# Load environment
if [ ! -f .env ]; then
    print_error ".env file not found!"
    exit 1
fi

source .env

# Get current image tags
print_info "Current deployment:"
docker compose ps --format "table {{.Service}}\t{{.Image}}\t{{.Status}}"
echo ""

# Ask for rollback confirmation
print_warning "This will rollback to the previous image version"
read -p "Enter the image tag to rollback to (e.g., 'main-abc123' or 'v1.0.0'): " ROLLBACK_TAG

if [ -z "$ROLLBACK_TAG" ]; then
    print_error "No tag specified. Rollback cancelled."
    exit 1
fi

# Confirm
read -p "Rollback to tag '${ROLLBACK_TAG}'? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    print_info "Rollback cancelled"
    exit 0
fi

# Create backup of current state
print_info "Creating database backup before rollback..."
./backup.sh

# Update .env with rollback tag
print_info "Updating image tag to: ${ROLLBACK_TAG}"
sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=${ROLLBACK_TAG}/" .env

# Pull rollback images
print_info "Pulling rollback images..."
docker compose pull

# Stop current containers
print_info "Stopping current containers..."
docker compose down

# Start with rollback version
print_info "Starting containers with rollback version..."
docker compose up -d

# Wait for health checks
print_info "Waiting for services to be healthy..."
sleep 10

# Check status
print_info "Container status:"
docker compose ps

echo ""
print_success "Rollback completed!"
print_info "If you encounter issues, you can restore the database backup from ./backups/"
