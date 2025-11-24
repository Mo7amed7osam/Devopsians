#!/bin/bash

# ===============================================
# MongoDB Backup Script
# ===============================================

set -e

# Load environment variables
if [ -f .env ]; then
    source .env
fi

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="devopsians_backup_${TIMESTAMP}"
CONTAINER_NAME="devopsians-mongodb-${DEPLOY_ENV:-production}"

# Retention settings (days)
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== MongoDB Backup Script ===${NC}"
echo "Timestamp: $(date)"
echo "Backup name: ${BACKUP_NAME}"
echo ""

# Create backup directory if it doesn't exist
mkdir -p ${BACKUP_DIR}

# Perform backup
echo -e "${YELLOW}Starting backup...${NC}"
docker exec ${CONTAINER_NAME} mongodump \
    --username=${MONGO_ROOT_USERNAME:-admin} \
    --password=${MONGO_ROOT_PASSWORD:-adminpassword} \
    --authenticationDatabase=admin \
    --db=${MONGO_DATABASE:-devopsians} \
    --out=/backups/${BACKUP_NAME}

# Compress backup
echo -e "${YELLOW}Compressing backup...${NC}"
cd ${BACKUP_DIR}
tar -czf ${BACKUP_NAME}.tar.gz ${BACKUP_NAME}
rm -rf ${BACKUP_NAME}
cd - > /dev/null

# Calculate backup size
BACKUP_SIZE=$(du -h ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz | cut -f1)
echo -e "${GREEN}✓ Backup completed: ${BACKUP_SIZE}${NC}"
echo "Location: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"

# Clean old backups
echo ""
echo -e "${YELLOW}Cleaning old backups (retention: ${RETENTION_DAYS} days)...${NC}"
find ${BACKUP_DIR} -name "devopsians_backup_*.tar.gz" -mtime +${RETENTION_DAYS} -delete
REMAINING_BACKUPS=$(ls -1 ${BACKUP_DIR}/devopsians_backup_*.tar.gz 2>/dev/null | wc -l)
echo -e "${GREEN}✓ Cleanup completed. Remaining backups: ${REMAINING_BACKUPS}${NC}"

# Optional: Upload to cloud storage (uncomment and configure)
# echo ""
# echo -e "${YELLOW}Uploading to cloud storage...${NC}"
# aws s3 cp ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz s3://your-bucket/backups/
# echo -e "${GREEN}✓ Upload completed${NC}"

echo ""
echo -e "${GREEN}=== Backup process completed ===${NC}"
