# Devopsians Deployment Guide

Complete deployment configuration with automatic environment detection for Development, Staging, and Production environments.

## 📋 Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Configuration](#environment-configuration)
- [Deployment Scripts](#deployment-scripts)
- [Manual Deployment](#manual-deployment)
- [Services](#services)
- [Health Checks](#health-checks)
- [Troubleshooting](#troubleshooting)

## ✨ Features

- **Automatic Environment Detection**: Detects and configures based on hostname or user input
- **Multi-Environment Support**: Separate configs for development, staging, and production
- **Health Checks**: Built-in health monitoring for all services
- **MongoDB Integration**: Containerized database with persistence
- **Service Dependencies**: Proper startup ordering with health-based dependencies
- **Easy Deployment**: One-command deployment scripts for Windows and Linux

## 🔧 Prerequisites

- Docker Engine 20.10+
- Docker Compose v2.0+ (or docker-compose v1.29+)
- Git (for cloning repository)

### Install Docker

**Windows/Mac**: Install [Docker Desktop](https://www.docker.com/products/docker-desktop)

**Linux**:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

## 🚀 Quick Start

### 1. Clone and Navigate

```bash
cd Deploy
```

### 2. Choose Your Environment

**Option A: Auto-detect environment**
```bash
# Linux/Mac
./deploy.sh

# Windows
deploy.bat
```

**Option B: Manual environment selection**
```bash
# Copy the appropriate environment file
cp .env.development .env   # For development
cp .env.staging .env       # For staging
cp .env.production .env    # For production

# Edit the .env file with your specific values
nano .env  # or use any text editor
```

### 3. Deploy

**Linux/Mac**:
```bash
chmod +x deploy.sh
./deploy.sh
```

**Windows**:
```cmd
deploy.bat
```

**With logs**:
```bash
# Linux/Mac
./deploy.sh --logs

# Windows
deploy.bat --logs
```

### 4. Access Your Application

- **Frontend**: http://localhost (or configured port)
- **Backend API**: http://localhost:3030
- **MongoDB**: mongodb://localhost:27017

## ⚙️ Environment Configuration

### Environment Files

- `.env.example` - Template with all available options
- `.env.development` - Development environment settings
- `.env.staging` - Staging environment settings
- `.env.production` - Production environment settings
- `.env` - Active configuration (gitignored)

### Key Configuration Variables

```bash
# Environment
DEPLOY_ENV=production          # development, staging, or production
NODE_ENV=production           # Node.js environment

# Docker
DOCKERHUB_USERNAME=your-username
IMAGE_TAG=latest              # or specific version tag

# Ports
FRONTEND_PORT=80
BACKEND_PORT=3030
MONGO_PORT=27017

# Database
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=secure-password
MONGO_DATABASE=devopsians
MONGO_URL=mongodb://admin:secure-password@mongodb:27017/devopsians?authSource=admin

# Security
JWT_SECRET_KEY=your-secret-key
JWT_EXPIRES=1d

# URLs
FRONTEND_URL=http://localhost
VITE_API_URL=http://localhost:3030
```

### Environment-Specific Defaults

| Setting | Development | Staging | Production |
|---------|-------------|---------|------------|
| Log Level | debug | info | warn |
| JWT Expires | 7d | 1d | 1d |
| Port (Frontend) | 3000 | 80 | 80 |
| Port (Backend) | 3030 | 3030 | 3030 |

## 🎯 Deployment Scripts

### deploy.sh (Linux/Mac)

```bash
./deploy.sh              # Deploy with environment detection
./deploy.sh --logs       # Deploy and follow logs
./deploy.sh --help       # Show help
```

Features:
- Automatic environment detection based on hostname
- Interactive environment selection
- Prerequisites checking
- Color-coded output
- Health status monitoring

### deploy.bat (Windows)

```cmd
deploy.bat              # Deploy with environment detection
deploy.bat --logs       # Deploy and follow logs
```

Same features as Linux script, adapted for Windows.

## 🔨 Manual Deployment

If you prefer manual control:

```bash
# 1. Create/update .env file
cp .env.production .env

# 2. Pull latest images
docker compose pull

# 3. Stop existing containers
docker compose down

# 4. Start services
docker compose up -d

# 5. Check status
docker compose ps

# 6. View logs
docker compose logs -f
```

## 🐳 Services

### MongoDB (mongodb)
- **Image**: mongo:7-jammy
- **Port**: 27017 (configurable)
- **Volumes**: Persistent data storage
- **Health Check**: MongoDB ping command

### Backend (backend)
- **Image**: devopsians-backend:latest
- **Port**: 3030 (configurable)
- **Dependencies**: MongoDB (waits for healthy status)
- **Health Check**: HTTP endpoint check
- **Environment**: Full Node.js/Express configuration

### Frontend (frontend)
- **Image**: devopsians-frontend:latest
- **Port**: 80 (configurable)
- **Dependencies**: Backend (waits for healthy status)
- **Health Check**: HTTP endpoint check
- **Server**: Nginx with React/Vite build

## 🏥 Health Checks

All services include health checks:

```yaml
# MongoDB
healthcheck:
  test: mongosh ping
  interval: 10s
  timeout: 5s
  retries: 5

# Backend
healthcheck:
  test: HTTP GET /health
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s

# Frontend
healthcheck:
  test: wget spider check
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 20s
```

Check health status:
```bash
docker compose ps
docker inspect devopsians-backend-production | grep -A 10 Health
```

## 🔍 Troubleshooting

### Services won't start

```bash
# Check logs
docker compose logs

# Check specific service
docker compose logs backend
docker compose logs frontend
docker compose logs mongodb

# Check health status
docker compose ps
```

### Environment not detected

```bash
# Manually copy environment file
cp .env.production .env

# Verify contents
cat .env

# Redeploy
docker compose up -d
```

### Database connection issues

```bash
# Check MongoDB is running and healthy
docker compose ps mongodb

# Test connection
docker exec -it devopsians-mongodb mongosh -u admin -p adminpassword

# Check backend logs for connection errors
docker compose logs backend | grep -i mongo
```

### Port conflicts

```bash
# Check what's using the port
# Linux/Mac
sudo lsof -i :80
sudo lsof -i :3030

# Windows
netstat -ano | findstr :80
netstat -ano | findstr :3030

# Change ports in .env
FRONTEND_PORT=8080
BACKEND_PORT=3031

# Redeploy
docker compose up -d
```

### Reset everything

```bash
# Stop and remove all containers, networks, and volumes
docker compose down -v

# Remove all images (optional)
docker compose down -v --rmi all

# Fresh start
./deploy.sh
```

## 🔐 Security Best Practices

### For Production:

1. **Change all default credentials**:
   - MongoDB passwords
   - JWT secret keys

2. **Use strong passwords**:
   ```bash
   # Generate random password
   openssl rand -base64 32
   ```

3. **Don't commit .env files**:
   - Already in .gitignore
   - Never commit production credentials

4. **Use environment-specific secrets**:
   - Different credentials per environment
   - Rotate secrets regularly

5. **Enable SSL/TLS**:
   - Use reverse proxy (nginx, traefik)
   - Configure HTTPS certificates

## 📊 Monitoring

### View logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend

# Last 100 lines
docker compose logs --tail=100

# Since timestamp
docker compose logs --since 2024-01-01T00:00:00
```

### Resource usage
```bash
docker stats
```

### Service status
```bash
docker compose ps
docker compose top
```

## 🔄 Updates and Maintenance

### Update images
```bash
# Pull latest images
docker compose pull

# Recreate containers
docker compose up -d
```

### Backup database
```bash
# Export MongoDB
docker exec devopsians-mongodb mongodump --out=/data/backup

# Copy from container
docker cp devopsians-mongodb:/data/backup ./backup
```

### Restore database
```bash
# Copy to container
docker cp ./backup devopsians-mongodb:/data/backup

# Import
docker exec devopsians-mongodb mongorestore /data/backup
```

## 📝 Environment Detection Logic

The deployment script detects environment in this order:

1. **Existing .env file**: Uses current configuration
2. **Hostname matching**: 
   - Contains "prod/production" → production
   - Contains "staging/stg" → staging
   - Otherwise → development
3. **User confirmation**: Asks to confirm or select manually
4. **Fallback**: Uses .env.example as template

## 🎓 Advanced Usage

### Custom compose file
```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d
```

### Scale services
```bash
# Not applicable for this setup (single instances)
# But possible for stateless services
```

### Network inspection
```bash
docker network ls
docker network inspect devopsians-net-production
```

## 📞 Support

For issues or questions:
- Check logs: `docker compose logs`
- Review configuration: `.env` file
- Verify health: `docker compose ps`

---

**Maintained by**: Devopsians Team  
**Last Updated**: 2025
