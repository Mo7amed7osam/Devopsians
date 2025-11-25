# 🚀 Devopsians Complete Deployment Guide

**Complete documentation for deploying, configuring, and maintaining the Devopsians application**

---

## 📑 Table of Contents

1. [Quick Start](#-quick-start)
2. [Features & Capabilities](#-features--capabilities)
3. [Prerequisites](#-prerequisites)
4. [Environment Configuration](#-environment-configuration)
5. [Deployment Methods](#-deployment-methods)
6. [Services Overview](#-services-overview)
7. [Security Configuration](#-security-configuration)
8. [Monitoring & Health Checks](#-monitoring--health-checks)
9. [Backup & Recovery](#-backup--recovery)
10. [CI/CD & Automation](#-cicd--automation)
11. [Troubleshooting](#-troubleshooting)
12. [Maintenance & Updates](#-maintenance--updates)
13. [Production Deployment Checklist](#-production-deployment-checklist)
14. [Advanced Features](#-advanced-features)

---

## 🚀 Quick Start

### 5-Minute Deployment

```bash
# 1. Navigate to Deploy folder
cd Deploy

# 2. Make scripts executable (Linux/Mac)
chmod +x *.sh

# 3. Choose environment
./switch-env.sh          # Interactive menu

# 4. Deploy
./deploy.sh              # Auto-detects and deploys

# 5. Monitor
./monitor.sh             # Real-time status dashboard
```

### Windows Quick Start

```cmd
# 1. Navigate to Deploy folder
cd Deploy

# 2. Choose environment
switch-env.bat

# 3. Deploy
deploy.bat

# 4. Monitor
monitor.bat
```

### Access Your Application

After successful deployment:
- **Frontend**: http://localhost:80 (or configured port)
- **Backend API**: http://localhost:3030
- **Health Check**: http://localhost:3030/health
- **MongoDB**: mongodb://localhost:27017

---

## ✨ Features & Capabilities

### Core Features

- ✅ **Multi-Environment Support**: Development, Staging, Production
- ✅ **Automatic Environment Detection**: Smart hostname-based detection
- ✅ **One-Command Deployment**: Simple script-based deployment
- ✅ **Health Monitoring**: Built-in health checks for all services
- ✅ **Service Dependencies**: Proper startup ordering
- ✅ **Persistent Data**: Docker volumes for database
- ✅ **Cross-Platform**: Works on Linux, Mac, and Windows

### Advanced Features

- 🚀 **CI/CD Pipeline**: GitHub Actions integration
- 🔒 **Nginx Reverse Proxy**: Production-ready with SSL support
- 💾 **Automated Backups**: MongoDB backup and restore scripts
- 📊 **Monitoring Stack**: Prometheus + Grafana (optional)
- ⏮️ **Rollback Capability**: Quick version rollback
- 🔐 **Security Hardening**: Rate limiting, resource limits

---

## 🔧 Prerequisites

### Required Software

1. **Docker Engine** (20.10 or higher)
   ```bash
   # Check version
   docker --version
   ```

2. **Docker Compose** (v2.0 or higher)
   ```bash
   # Check version
   docker compose version
   ```

### Installation Guides

#### Linux
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose (included with Docker Engine)
# Logout and login for group changes to take effect
```

#### Mac
```bash
# Install Docker Desktop
# Download from: https://www.docker.com/products/docker-desktop
# Docker Compose is included
```

#### Windows
```powershell
# Install Docker Desktop
# Download from: https://www.docker.com/products/docker-desktop
# Docker Compose is included
```

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Disk Space | 10 GB | 20+ GB |
| OS | Linux/Mac/Windows 10+ | Linux Server |

---

## ⚙️ Environment Configuration

### Environment Files

| File | Purpose | When to Use |
|------|---------|-------------|
| `.env.example` | Template with all options | Reference & new setups |
| `.env.development` | Development settings | Local development |
| `.env.staging` | Staging settings | Pre-production testing |
| `.env.production` | Production settings | Live deployment |
| `.env` | Active config (auto-generated) | Current environment |

### Key Configuration Variables

```bash
# ============================================
# ENVIRONMENT SETTINGS
# ============================================
DEPLOY_ENV=production          # Environment name
NODE_ENV=production           # Node.js environment

# ============================================
# DOCKER CONFIGURATION
# ============================================
DOCKERHUB_USERNAME=mahmoud8824 # Your Docker Hub username
IMAGE_TAG=latest              # Image version tag

# ============================================
# PORT CONFIGURATION
# ============================================
FRONTEND_PORT=80              # Frontend web port
BACKEND_PORT=3030             # Backend API port
MONGO_PORT=27017              # MongoDB port

# ============================================
# DATABASE CONFIGURATION
# ============================================
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=secure-password-here
MONGO_DATABASE=devopsians
MONGO_URL=mongodb://admin:secure-password-here@mongodb:27017/devopsians?authSource=admin

# ============================================
# SECURITY CONFIGURATION
# ============================================
JWT_SECRET_KEY=your-secret-key-here    # Generate: openssl rand -base64 32
JWT_EXPIRES=1d                         # Token expiration

# ============================================
# URLS
# ============================================
FRONTEND_URL=http://localhost
VITE_API_URL=http://localhost:3030
BACKEND_HOST=0.0.0.0

# ============================================
# OPTIONAL: EMAIL CONFIGURATION
# ============================================
EMAIL_USER=
EMAIL_PASS=

# ============================================
# LOGGING
# ============================================
LOG_LEVEL=info                # debug, info, warn, error
```

### Environment Comparison

| Setting | Development | Staging | Production |
|---------|-------------|---------|------------|
| **Log Level** | debug | info | warn |
| **JWT Expires** | 7 days | 1 day | 1 day |
| **Frontend Port** | 3000 | 80 | 80 |
| **Backend Port** | 3030 | 3030 | 3030 |
| **Database** | dev DB | staging DB | prod DB |
| **HTTPS** | Optional | Recommended | Required |

### Generate Secure Secrets

```bash
# Generate strong JWT secret (32 characters)
openssl rand -base64 32

# Generate MongoDB password (16 characters)
openssl rand -base64 16

# Generate random password
date +%s | sha256sum | base64 | head -c 32
```

---

## 🎯 Deployment Methods

### Method 1: Automated Script (Recommended)

**Linux/Mac:**
```bash
./deploy.sh                    # Auto-detect environment
./deploy.sh --logs             # Deploy with log streaming
DEPLOY_ENV=production ./deploy.sh  # Force specific environment
```

**Windows:**
```cmd
deploy.bat                     # Auto-detect environment
deploy.bat --logs              # Deploy with logs
```

**What it does:**
1. ✅ Detects environment (hostname or user selection)
2. ✅ Copies appropriate `.env.{environment}` to `.env`
3. ✅ Checks prerequisites (Docker, Docker Compose)
4. ✅ Stops existing containers gracefully
5. ✅ Pulls/builds latest images
6. ✅ Starts all services with health checks
7. ✅ Displays status and access URLs

### Method 2: Environment Switcher

```bash
# Interactive environment selection
./switch-env.sh                # Linux/Mac
switch-env.bat                 # Windows

# Shows menu:
# 1. Development
# 2. Staging
# 3. Production
# Select and it automatically copies and deploys
```

### Method 3: Manual Deployment

```bash
# 1. Select environment manually
cp .env.production .env

# 2. Edit configuration
nano .env                      # or vim, code, notepad++

# 3. Pull latest images
docker compose pull

# 4. Stop existing containers
docker compose down

# 5. Start services
docker compose up -d

# 6. Check status
docker compose ps

# 7. View logs
docker compose logs -f
```

### Method 4: Production with Nginx (Advanced)

```bash
# Production setup with reverse proxy and monitoring
docker compose -f docker-compose.production.yml up -d

# With monitoring stack (Prometheus + Grafana)
docker compose -f docker-compose.production.yml --profile monitoring up -d
```

### Method 5: Local Development Build

```bash
# Build images locally (no Docker Hub needed)
docker compose -f docker-compose.local.yml build
docker compose -f docker-compose.local.yml up -d
```

---

## 🐳 Services Overview

### MongoDB Database

**Purpose**: Primary data storage

| Attribute | Value |
|-----------|-------|
| **Image** | mongo:7-jammy |
| **Port** | 27017 (configurable) |
| **Volumes** | Persistent data + config |
| **Health Check** | MongoDB ping every 10s |
| **Container Name** | devopsians-mongodb |

**Features:**
- Persistent data storage
- Automatic health monitoring
- Configurable credentials
- Ready for replication

### Backend API Service

**Purpose**: Node.js/Express REST API

| Attribute | Value |
|-----------|-------|
| **Image** | mahmoud8824/devopsians-backend:latest |
| **Port** | 3030 (configurable) |
| **Dependencies** | MongoDB (waits for healthy) |
| **Health Check** | HTTP GET /health every 30s |
| **Container Name** | devopsians-backend-{env} |

**Features:**
- JWT authentication
- Socket.io for real-time
- Environment-based configuration
- Automatic dependency wait
- Health endpoint

### Frontend Web Service

**Purpose**: React/Vite application served by Nginx

| Attribute | Value |
|-----------|-------|
| **Image** | mahmoud8824/devopsians-frontend:latest |
| **Port** | 80 (configurable) |
| **Dependencies** | Backend (waits for healthy) |
| **Health Check** | HTTP GET / every 30s |
| **Container Name** | devopsians-frontend-{env} |

**Features:**
- Static file serving
- Nginx optimization
- Environment-based API URL
- Auto-waits for backend

### Service Dependencies

```
MongoDB (starts first)
   ↓ (waits for healthy)
Backend API (starts second)
   ↓ (waits for healthy)
Frontend (starts last)
```

---

## 🔐 Security Configuration

### Production Security Checklist

#### Critical Actions (Must Do)

- [ ] **Change all default passwords**
  ```bash
  # In .env.production
  MONGO_ROOT_PASSWORD=<strong-random-password>
  ```

- [ ] **Generate strong JWT secret**
  ```bash
  # Generate and add to .env.production
  JWT_SECRET_KEY=$(openssl rand -base64 32)
  ```

- [ ] **Never commit `.env` files**
  ```bash
  # Already in .gitignore
  cat .gitignore | grep .env
  ```

- [ ] **Use HTTPS in production**
  ```bash
  # Configure reverse proxy (Nginx/Traefik)
  # Get SSL certificate (Let's Encrypt)
  ```

- [ ] **Bind MongoDB to localhost only**
  ```yaml
  # In docker-compose.production.yml
  ports:
    - "127.0.0.1:27017:27017"  # Localhost only
  ```

#### Security Features

**Built-in Security:**
- ✅ MongoDB not exposed publicly (production compose)
- ✅ Rate limiting via Nginx
- ✅ Security headers (X-Frame-Options, etc.)
- ✅ Resource limits (CPU/Memory)
- ✅ Health-based dependencies
- ✅ Internal Docker network

**Recommended Additions:**
- 🔒 SSL/TLS certificates (Let's Encrypt)
- 🔒 Firewall rules (ufw, iptables)
- 🔒 fail2ban for SSH protection
- 🔒 Regular security updates
- 🔒 Secrets management (Vault, Docker Secrets)
- 🔒 Log monitoring and alerting

### SSL/TLS Setup (Production)

```bash
# Install Certbot
sudo apt-get install certbot

# Get certificate
sudo certbot certonly --standalone -d your-domain.com

# Update nginx/nginx.conf
# Uncomment SSL configuration section
# Point to certificate files

# Renew automatically
sudo certbot renew --dry-run
```

### Firewall Configuration

```bash
# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow SSH (change 22 to your SSH port)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## 📊 Monitoring & Health Checks

### Built-in Health Checks

All services include automatic health monitoring:

**MongoDB:**
```yaml
healthcheck:
  test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
  interval: 10s
  timeout: 5s
  retries: 5
```

**Backend:**
```yaml
healthcheck:
  test: ["CMD", "node", "-e", "require('http').get('http://localhost:3030/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

**Frontend:**
```yaml
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:80/"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 20s
```

### Monitoring Scripts

**Real-time Dashboard:**
```bash
./monitor.sh          # Linux/Mac
monitor.bat           # Windows
```

Displays:
- Container status (Up/Down)
- Health status (Healthy/Unhealthy)
- Resource usage (CPU/Memory)
- Recent logs
- Auto-refreshes every 5 seconds

### Manual Monitoring Commands

```bash
# Service status
docker compose ps

# Detailed health status
docker inspect devopsians-backend-production | grep -A 10 Health

# Resource usage
docker stats

# Live logs (all services)
docker compose logs -f

# Live logs (specific service)
docker compose logs -f backend

# Last 100 lines
docker compose logs --tail=100

# Logs since timestamp
docker compose logs --since 2025-01-01T00:00:00

# Container processes
docker compose top
```

### Prometheus + Grafana (Optional)

Enable monitoring stack:

```bash
# Deploy with monitoring
docker compose -f docker-compose.production.yml --profile monitoring up -d

# Access Grafana
open http://localhost:3100
# Username: admin
# Password: (set in GRAFANA_PASSWORD env var)

# Access Prometheus
open http://localhost:9090
```

**Metrics Collected:**
- Request rate and response time
- Error rates
- CPU and memory usage
- Database performance
- Network traffic

---

## 💾 Backup & Recovery

### Automated Backup Script

**Create Backup:**
```bash
chmod +x backup.sh
./backup.sh
```

**What it does:**
- ✅ Creates MongoDB dump
- ✅ Compresses with gzip
- ✅ Timestamps filename
- ✅ Stores in `./backups/` directory
- ✅ Cleans old backups (7-day retention)
- ✅ Optional cloud upload (S3/GCS)

**Backup Format:**
```
backups/
├── devopsians_backup_20250124_143022.tar.gz
├── devopsians_backup_20250125_020015.tar.gz
└── devopsians_backup_20250126_020003.tar.gz
```

### Restore from Backup

**Interactive Restore:**
```bash
chmod +x restore.sh
./restore.sh
```

**Manual Restore:**
```bash
# List available backups
ls -lh backups/

# Restore specific backup
./restore.sh devopsians_backup_20250126_020003.tar.gz
```

**What it does:**
- ✅ Lists available backups
- ✅ Validates backup file
- ✅ Asks for confirmation (data will be replaced!)
- ✅ Extracts and restores to MongoDB
- ✅ Verifies restoration

### Automated Backup Schedule

**Setup daily backups with cron:**

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /path/to/Devopsians/Deploy && ./backup.sh >> /var/log/devopsians-backup.log 2>&1

# Add weekly backup at Sunday 3 AM
0 3 * * 0 cd /path/to/Devopsians/Deploy && ./backup.sh && echo "Weekly backup completed"

# Save and exit
```

### Cloud Backup (Optional)

**AWS S3 Example:**
```bash
# Install AWS CLI
sudo apt-get install awscli

# Configure credentials
aws configure

# Add to backup.sh (uncomment cloud upload section)
# Or manually upload
aws s3 cp backups/ s3://your-bucket/devopsians-backups/ --recursive
```

### Disaster Recovery Plan

1. **Regular Backups**: Daily automated backups
2. **Off-site Storage**: Upload to cloud (S3/GCS/Azure)
3. **Test Restores**: Monthly restore testing
4. **Documentation**: Keep restoration steps updated
5. **Backup Monitoring**: Alert on backup failures

---

## 🤖 CI/CD & Automation

### GitHub Actions Pipeline

**Location:** `.github/workflows/ci-cd.yml`

**Workflow:**
1. **Test**: Run automated tests on push/PR
2. **Build**: Build Docker images
3. **Push**: Push images to Docker Hub
4. **Deploy**: Automated deployment to server

**Setup GitHub Secrets:**

```bash
# Go to: GitHub Repo → Settings → Secrets → Actions

# Add these secrets:
DOCKERHUB_USERNAME      # Your Docker Hub username
DOCKERHUB_TOKEN         # Docker Hub access token
VITE_API_URL           # Production API URL
DEPLOY_HOST            # Production server IP/hostname
DEPLOY_USER            # SSH username
DEPLOY_SSH_KEY         # SSH private key
```

**Trigger Conditions:**
- Push to `main` branch → Build + Deploy
- Push to `develop` branch → Build only
- Pull requests → Test only

### Docker Hub Integration

**Login to Docker Hub:**
```bash
# Interactive login
docker login

# With credentials
docker login -u mahmoud8824 -p <password>

# With access token (recommended)
echo "<access-token>" | docker login -u mahmoud8824 --password-stdin
```

**Build and Push Images:**
```bash
# Create build-and-push script
chmod +x build-and-push.sh

# Build locally and push
./build-and-push.sh

# With specific version
IMAGE_TAG=v1.0.0 ./build-and-push.sh
```

**Script Features:**
- ✅ Builds images from source
- ✅ Tags with version
- ✅ Pushes to Docker Hub
- ✅ Supports multiple tags (version + latest)
- ✅ Shows published URLs

### Versioning Strategy

**Semantic Versioning:**
```bash
# Major.Minor.Patch
v1.0.0    # Initial release
v1.0.1    # Bug fix
v1.1.0    # New feature
v2.0.0    # Breaking change
```

**Git Tags:**
```bash
# Create version tag
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# CI/CD automatically builds and tags Docker image
```

---

## 🛠️ Troubleshooting

### Common Issues & Solutions

#### 1. Services Won't Start

**Symptoms:** Containers exit immediately or stay in "Restarting" state

**Solutions:**
```bash
# Check logs for errors
docker compose logs

# Check specific service
docker compose logs backend

# Verify configuration
cat .env

# Check for port conflicts
sudo lsof -i :80
sudo lsof -i :3030
sudo lsof -i :27017

# Reset and restart
docker compose down -v
./deploy.sh
```

#### 2. Health Checks Failing

**Symptoms:** Services show "unhealthy" in `docker compose ps`

**Solutions:**
```bash
# Check health check details
docker inspect devopsians-backend-production | grep -A 20 Health

# Test health endpoint manually
curl http://localhost:3030/health

# Check backend logs
docker compose logs backend | tail -50

# Restart specific service
docker compose restart backend
```

#### 3. Database Connection Issues

**Symptoms:** Backend can't connect to MongoDB

**Solutions:**
```bash
# Verify MongoDB is running
docker compose ps mongodb

# Check MongoDB logs
docker compose logs mongodb

# Test connection from backend
docker exec -it devopsians-backend-development sh
nc -zv mongodb 27017

# Verify connection string in .env
cat .env | grep MONGO_URL

# Restart services in order
docker compose restart mongodb
docker compose restart backend
```

#### 4. Port Already in Use

**Symptoms:** "port is already allocated" error

**Solutions:**
```bash
# Find what's using the port
sudo lsof -i :80
sudo lsof -i :3030

# Option 1: Stop the conflicting service
sudo systemctl stop nginx  # or apache2, etc.

# Option 2: Change port in .env
nano .env
# Update: FRONTEND_PORT=8080

# Redeploy
docker compose up -d
```

#### 5. Image Pull Failures

**Symptoms:** "pull access denied" or "repository does not exist"

**Solutions:**
```bash
# Check Docker Hub username in .env
cat .env | grep DOCKERHUB_USERNAME

# Login to Docker Hub
docker login

# Try pulling manually
docker pull mahmoud8824/devopsians-backend:latest

# For development, build locally instead
docker compose -f docker-compose.local.yml build
docker compose -f docker-compose.local.yml up -d
```

#### 6. Environment Variables Not Loading

**Symptoms:** Services use default values instead of .env values

**Solutions:**
```bash
# Verify .env file exists
ls -la .env

# Check file permissions
chmod 644 .env

# Verify format (no spaces around =)
cat .env | grep -v "^#" | grep "="

# Recreate containers
docker compose down
docker compose up -d
```

### Debug Mode

**Enable verbose logging:**
```bash
# Set in .env
LOG_LEVEL=debug

# Restart services
docker compose restart backend

# Follow logs
docker compose logs -f backend
```

### Complete Reset

**When all else fails:**
```bash
# Stop and remove everything
docker compose down -v

# Remove all project images
docker compose down -v --rmi all

# Clean Docker system
docker system prune -a

# Fresh deployment
./deploy.sh
```

---

## 🔄 Maintenance & Updates

### Regular Updates

**Update Docker images:**
```bash
# Pull latest images
docker compose pull

# Recreate containers with new images
docker compose up -d

# Or use deployment script
./deploy.sh
```

**Update application code:**
```bash
# Pull latest code
git pull origin main

# Rebuild and redeploy
docker compose -f docker-compose.local.yml build
docker compose up -d
```

### Rollback to Previous Version

**Using rollback script:**
```bash
chmod +x rollback.sh
./rollback.sh

# Enter version tag when prompted
# Example: v1.0.0 or main-abc123
```

**Manual rollback:**
```bash
# Stop current version
docker compose down

# Change IMAGE_TAG in .env
nano .env
# Update: IMAGE_TAG=v1.0.0

# Pull and start
docker compose pull
docker compose up -d
```

### Database Maintenance

**Backup before maintenance:**
```bash
./backup.sh
```

**Optimize database:**
```bash
# Connect to MongoDB
docker exec -it devopsians-mongodb mongosh -u admin -p <password>

# Compact collections
use devopsians
db.runCommand({ compact: 'collectionName' })

# Repair database
db.repairDatabase()
```

**Monitor database size:**
```bash
# Get database stats
docker exec devopsians-mongodb mongosh -u admin -p <password> --eval "db.stats()"

# Check disk usage
docker exec devopsians-mongodb df -h /data/db
```

### Log Rotation

**Prevent logs from filling disk:**
```bash
# Configure in /etc/docker/daemon.json
sudo nano /etc/docker/daemon.json
```

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

```bash
# Restart Docker
sudo systemctl restart docker

# Verify
docker info | grep -A 5 "Logging Driver"
```

### Scheduled Maintenance

**Create maintenance script:**
```bash
# maintenance.sh
#!/bin/bash
echo "Starting maintenance..."
./backup.sh
docker compose pull
docker compose up -d
docker system prune -f
echo "Maintenance complete"
```

**Schedule with cron:**
```bash
crontab -e

# Weekly maintenance Sunday 3 AM
0 3 * * 0 /path/to/Deploy/maintenance.sh >> /var/log/devopsians-maintenance.log 2>&1
```

---

## ✅ Production Deployment Checklist

### Phase 1: Pre-Deployment (1-2 hours)

**Environment Setup:**
- [ ] Server provisioned with adequate resources
- [ ] Docker and Docker Compose installed
- [ ] Git repository cloned
- [ ] Firewall configured (ports 80, 443, 22)
- [ ] DNS records configured

**Security Configuration:**
- [ ] Generate strong passwords: `openssl rand -base64 32`
- [ ] Copy `.env.production` to `.env`
- [ ] **CRITICAL:** Change `MONGO_ROOT_PASSWORD`
- [ ] **CRITICAL:** Change `JWT_SECRET_KEY`
- [ ] **CRITICAL:** Update all URLs to production domains
- [ ] Verify no default credentials remain
- [ ] Enable SSL/TLS certificates
- [ ] Configure fail2ban for SSH

**Configuration Review:**
- [ ] All environment variables set correctly
- [ ] Database credentials are strong and unique
- [ ] Ports are configured correctly
- [ ] URLs point to production domains
- [ ] Email configuration (if using)
- [ ] Logging level set to `warn` or `error`

### Phase 2: Deployment (30-60 minutes)

**Initial Deployment:**
- [ ] Review `DEPLOYMENT-CHECKLIST.md` completely
- [ ] Run deployment: `./deploy.sh`
- [ ] Verify all containers started: `docker compose ps`
- [ ] Check health status: all services show "healthy"
- [ ] Test health endpoint: `curl http://localhost:3030/health`

**Verification:**
- [ ] Frontend loads successfully
- [ ] Backend API responds
- [ ] Database connection works
- [ ] Can register new user
- [ ] Can login successfully
- [ ] All features functional
- [ ] No errors in logs

**SSL/HTTPS:**
- [ ] SSL certificates obtained (Let's Encrypt)
- [ ] Nginx configured for HTTPS
- [ ] HTTP redirects to HTTPS
- [ ] SSL test passes (ssllabs.com)

### Phase 3: Post-Deployment (1-2 hours)

**Monitoring Setup:**
- [ ] Health checks passing
- [ ] Log monitoring configured
- [ ] Resource monitoring active
- [ ] Alerts configured (optional)
- [ ] Error tracking setup (Sentry, etc.)

**Backup Configuration:**
- [ ] Initial database backup: `./backup.sh`
- [ ] Automated backups scheduled (cron)
- [ ] Backup restoration tested
- [ ] Off-site backup configured (S3/GCS)
- [ ] Backup monitoring/alerting

**Documentation:**
- [ ] Access credentials documented (securely)
- [ ] Team members granted access
- [ ] Deployment details recorded
- [ ] Rollback procedure documented
- [ ] On-call rotation established

**Performance:**
- [ ] Load testing completed
- [ ] Response times acceptable
- [ ] Resource usage within limits
- [ ] Database queries optimized

### Phase 4: Ongoing (Daily/Weekly)

**Daily Tasks:**
- [ ] Monitor service health: `./monitor.sh`
- [ ] Check error logs
- [ ] Verify backups completed
- [ ] Review resource usage

**Weekly Tasks:**
- [ ] Review performance metrics
- [ ] Check disk space
- [ ] Review security logs
- [ ] Test backup restoration

**Monthly Tasks:**
- [ ] Update dependencies
- [ ] Security patches
- [ ] Rotate secrets
- [ ] Review and optimize

---

## 🚀 Advanced Features

### Production Compose with Nginx

**Features:**
- Reverse proxy with SSL termination
- Rate limiting (10 req/s API, 50 req/s general)
- Security headers
- Static caching
- Gzip compression
- WebSocket support

**Deploy:**
```bash
docker compose -f docker-compose.production.yml up -d
```

### Monitoring Stack

**Enable Prometheus + Grafana:**
```bash
docker compose -f docker-compose.production.yml --profile monitoring up -d
```

**Access:**
- Grafana: http://localhost:3100 (admin/password)
- Prometheus: http://localhost:9090

### Resource Limits

**Configure in docker-compose.production.yml:**
```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
    reservations:
      cpus: '0.5'
      memory: 512M
```

### Custom Docker Network

**Multi-service isolation:**
```bash
# Services communicate via internal network
# No direct external access
# Only Nginx exposed to public
```

### Environment Variables in Code

**Backend (Node.js):**
```javascript
const config = {
  port: process.env.PORT || 3030,
  mongoUrl: process.env.MONGO_URL,
  jwtSecret: process.env.JWT_SECRET_KEY,
  nodeEnv: process.env.NODE_ENV
};
```

**Frontend (React/Vite):**
```javascript
const API_URL = import.meta.env.VITE_API_URL;
```

---

## 📚 Additional Resources

### Documentation Files

- **[QUICKSTART.md](QUICKSTART.md)** - 5-minute quick reference
- **[ARCHITECTURE_DIAGRAMS.md](ARCHITECTURE_DIAGRAMS.md)** - Visual system architecture
- **[ENHANCEMENTS.md](ENHANCEMENTS.md)** - Advanced features documentation
- **[DEPLOYMENT-CHECKLIST.md](DEPLOYMENT-CHECKLIST.md)** - Step-by-step checklist

### External Resources

- [Docker Documentation](https://docs.docker.com)
- [Docker Compose](https://docs.docker.com/compose)
- [MongoDB Documentation](https://docs.mongodb.com)
- [Nginx Documentation](https://nginx.org/en/docs)
- [Let's Encrypt](https://letsencrypt.org)

### Support

**For Issues:**
1. Check logs: `docker compose logs -f`
2. Review this guide's troubleshooting section
3. Check service health: `./monitor.sh`
4. Review environment configuration: `cat .env`

---

## 📊 Quick Reference Commands

### Deployment
```bash
./deploy.sh                          # Auto-detect and deploy
./switch-env.sh                      # Switch environments
./monitor.sh                         # Monitor services
```

### Docker Compose
```bash
docker compose ps                    # Service status
docker compose logs -f               # Follow logs
docker compose restart backend       # Restart service
docker compose down                  # Stop all
docker compose up -d                 # Start all
```

### Backup & Recovery
```bash
./backup.sh                          # Create backup
./restore.sh                         # Restore from backup
./rollback.sh                        # Rollback version
```

### Monitoring
```bash
docker stats                         # Resource usage
docker compose top                   # Process list
curl http://localhost:3030/health    # Health check
```

---

**Version:** 1.0  
**Last Updated:** November 2025  
**Maintained by:** Devopsians Team

---

**🎉 You now have everything you need to deploy, maintain, and scale Devopsians!**

**Start here:** Choose your deployment method above and follow the steps.  
**Need help?** Check the troubleshooting section or review specific documentation files.  
**Production?** Follow the complete production deployment checklist.
