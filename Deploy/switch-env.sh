#!/bin/bash

# ===============================================
# Quick Environment Switcher
# ===============================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "=========================================="
echo "  Environment Switcher"
echo "=========================================="
echo ""
echo "Select environment:"
echo "  1) Development"
echo "  2) Staging"
echo "  3) Production"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        ENV="development"
        ;;
    2)
        ENV="staging"
        ;;
    3)
        ENV="production"
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

if [ -f ".env.$ENV" ]; then
    cp ".env.$ENV" .env
    echo -e "${GREEN}✓${NC} Switched to $ENV environment"
    echo ""
    echo "Current configuration:"
    grep -E "^(DEPLOY_ENV|NODE_ENV|FRONTEND_PORT|BACKEND_PORT)" .env
    echo ""
    echo "Run deployment:"
    echo -e "  ${BLUE}./deploy.sh${NC}"
else
    echo "Environment file .env.$ENV not found!"
    exit 1
fi
