#!/bin/bash

# ===============================================
# Service Monitor Script
# ===============================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

clear

echo "=========================================="
echo "  Devopsians Service Monitor"
echo "=========================================="
echo ""

# Check if services are running
if ! docker compose ps | grep -q "Up"; then
    echo -e "${RED}✗${NC} No services running"
    echo ""
    echo "Start services with: ./deploy.sh"
    exit 1
fi

# Load environment
if [ -f .env ]; then
    source .env
fi

FRONTEND_PORT=${FRONTEND_PORT:-80}
BACKEND_PORT=${BACKEND_PORT:-3030}
MONGO_PORT=${MONGO_PORT:-27017}
DEPLOY_ENV=${DEPLOY_ENV:-unknown}

echo -e "${BLUE}Environment:${NC} $DEPLOY_ENV"
echo ""

# Service Status
echo "=========================================="
echo "  Service Status"
echo "=========================================="
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo ""

# Health Checks
echo "=========================================="
echo "  Health Status"
echo "=========================================="

# Backend Health
echo -n "Backend API:      "
if curl -s -o /dev/null -w "%{http_code}" http://localhost:$BACKEND_PORT/health 2>/dev/null | grep -q "200"; then
    echo -e "${GREEN}✓ Healthy${NC}"
else
    echo -e "${RED}✗ Unhealthy${NC}"
fi

# Frontend Health
echo -n "Frontend:         "
if curl -s -o /dev/null -w "%{http_code}" http://localhost:$FRONTEND_PORT/ 2>/dev/null | grep -q "200"; then
    echo -e "${GREEN}✓ Healthy${NC}"
else
    echo -e "${RED}✗ Unhealthy${NC}"
fi

# MongoDB Health
echo -n "MongoDB:          "
if docker exec devopsians-mongodb mongosh --quiet --eval "db.adminCommand('ping')" 2>/dev/null | grep -q "ok"; then
    echo -e "${GREEN}✓ Healthy${NC}"
else
    echo -e "${RED}✗ Unhealthy${NC}"
fi

echo ""

# URLs
echo "=========================================="
echo "  Access URLs"
echo "=========================================="
echo "Frontend:  http://localhost:$FRONTEND_PORT"
echo "Backend:   http://localhost:$BACKEND_PORT"
echo "Health:    http://localhost:$BACKEND_PORT/health"
echo "MongoDB:   mongodb://localhost:$MONGO_PORT"
echo ""

# Resource Usage
echo "=========================================="
echo "  Resource Usage"
echo "=========================================="
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" | grep devopsians
echo ""

# Recent Logs
echo "=========================================="
echo "  Recent Activity (last 5 lines per service)"
echo "=========================================="
echo ""
echo -e "${BLUE}[Backend]${NC}"
docker compose logs --tail=5 backend 2>/dev/null | tail -5
echo ""
echo -e "${BLUE}[Frontend]${NC}"
docker compose logs --tail=5 frontend 2>/dev/null | tail -5
echo ""

# Commands
echo "=========================================="
echo "  Quick Commands"
echo "=========================================="
echo "  View logs:      docker compose logs -f"
echo "  Restart:        docker compose restart"
echo "  Stop:           docker compose down"
echo "  Redeploy:       ./deploy.sh"
echo "=========================================="
