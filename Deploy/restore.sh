#!/bin/bash

# ===============================================
# MongoDB Restore Script
# ===============================================

set -e

# Load environment variables
if [ -f .env ]; then
    source .env
fi

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BACKUP_DIR="./backups"
CONTAINER_NAME="devopsians-mongodb-${DEPLOY_ENV:-production}"

echo -e "${GREEN}=== MongoDB Restore Script ===${NC}"
echo ""

# List available backups
echo -e "${YELLOW}Available backups:${NC}"
ls -lh ${BACKUP_DIR}/*.tar.gz 2>/dev/null || echo "No backups found"
echo ""

# Get backup file from user
read -p "Enter backup filename (without path): " BACKUP_FILE

if [ ! -f "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
    echo -e "${RED}Error: Backup file not found!${NC}"
    exit 1
fi

# Confirm restoration
echo -e "${RED}WARNING: This will replace all data in the database!${NC}"
read -p "Are you sure you want to restore? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

# Extract backup
echo -e "${YELLOW}Extracting backup...${NC}"
BACKUP_NAME=$(basename ${BACKUP_FILE} .tar.gz)
cd ${BACKUP_DIR}
tar -xzf ${BACKUP_FILE}
cd - > /dev/null

# Perform restore
echo -e "${YELLOW}Restoring database...${NC}"
docker exec ${CONTAINER_NAME} mongorestore \
    --username=${MONGO_ROOT_USERNAME:-admin} \
    --password=${MONGO_ROOT_PASSWORD:-adminpassword} \
    --authenticationDatabase=admin \
    --db=${MONGO_DATABASE:-devopsians} \
    --drop \
    /backups/${BACKUP_NAME}/${MONGO_DATABASE:-devopsians}

# Cleanup extracted files
rm -rf ${BACKUP_DIR}/${BACKUP_NAME}

echo ""
echo -e "${GREEN}✓ Restore completed successfully${NC}"
echo "Timestamp: $(date)"
