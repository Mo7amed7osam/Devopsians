#!/bin/bash

# ===============================================
# Quick Deployment with MongoDB Atlas
# ===============================================

echo "=========================================="
echo "  Deploying Devopsians with MongoDB Atlas"
echo "=========================================="
echo ""

# Navigate to Deploy directory
cd "$(dirname "$0")"

# Check if .env exists, if not copy from production
if [ ! -f .env ]; then
    echo "Creating .env from .env.production..."
    cp .env.production .env
fi

# Show MongoDB configuration
source .env
echo "MongoDB Configuration:"
if [[ "${MONGO_URL}" == mongodb+srv://* ]]; then
    echo "  ✓ Using MongoDB Atlas (Cloud)"
    echo "  Database: devopsians"
else
    echo "  ✓ Using Local MongoDB"
fi
echo ""

# Run deployment
echo "Starting deployment..."
./deploy.sh "$@"

echo ""
echo "=========================================="
echo "  Deployment Complete!"
echo "=========================================="
echo ""
echo "To view logs:"
echo "  docker logs devopsians-backend-production -f"
echo ""
echo "To check status:"
echo "  docker-compose -f docker-compose.atlas.yml ps"
echo ""
