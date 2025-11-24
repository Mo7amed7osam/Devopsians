# Devopsians Deploy - Quick Reference

## 🚀 Quick Commands

### Deploy with auto-detection
```bash
# Linux/Mac
./deploy.sh

# Windows
deploy.bat
```

### Switch environments
```bash
# Linux/Mac
./switch-env.sh

# Windows
switch-env.bat
```

### Manual commands
```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# Check status
docker compose ps

# Restart a service
docker compose restart backend
```

## 📁 Environment Files

| File | Purpose |
|------|---------|
| `.env.development` | Development settings |
| `.env.staging` | Staging settings |
| `.env.production` | Production settings |
| `.env.example` | Template/reference |
| `.env` | Active config (auto-generated) |

## 🌍 Environments

### Development
- Ports: Frontend 3000, Backend 3030
- Debug logging enabled
- Longer JWT expiry (7d)
- Development database

### Staging
- Ports: Frontend 80, Backend 3030
- Production-like setup
- Testing environment
- Separate database

### Production
- Ports: Frontend 80, Backend 3030
- Optimized settings
- Warning-level logging
- Production database

## 🔧 Configuration

Edit `.env` or environment-specific files:

```bash
# Environment
DEPLOY_ENV=production
NODE_ENV=production

# Docker
DOCKERHUB_USERNAME=your-username
IMAGE_TAG=latest

# Ports
FRONTEND_PORT=80
BACKEND_PORT=3030

# Database
MONGO_URL=mongodb://user:pass@mongodb:27017/db

# Security
JWT_SECRET_KEY=your-secret-key
```

## 🏥 Health Checks

All services include health monitoring:
- MongoDB: Database ping
- Backend: HTTP /health endpoint
- Frontend: HTTP root endpoint

Check health:
```bash
docker compose ps
curl http://localhost:3030/health
```

## 🐛 Troubleshooting

### View logs
```bash
docker compose logs backend
docker compose logs frontend
docker compose logs mongodb
```

### Restart services
```bash
docker compose restart
```

### Full reset
```bash
docker compose down -v
./deploy.sh
```

### Port conflicts
Edit `.env` and change:
```bash
FRONTEND_PORT=8080
BACKEND_PORT=3031
```

## 📊 Monitoring

```bash
# Real-time logs
docker compose logs -f

# Resource usage
docker stats

# Service status
docker compose ps
```

## 🔐 Security

**Before production:**
1. Change all passwords in `.env.production`
2. Generate strong JWT secret: `openssl rand -base64 32`
3. Never commit `.env` files
4. Use HTTPS in production

## 📝 Deployment Workflow

1. **Prepare**: Select/create environment file
2. **Configure**: Edit `.env` with your values
3. **Deploy**: Run `./deploy.sh`
4. **Verify**: Check `docker compose ps`
5. **Monitor**: View logs if needed

## 🔄 Updates

```bash
# Pull latest images
docker compose pull

# Restart with new images
docker compose up -d

# Or use deploy script
./deploy.sh
```

## 📦 Services URLs

After deployment:
- **Frontend**: http://localhost:80
- **Backend**: http://localhost:3030
- **MongoDB**: mongodb://localhost:27017
- **Health**: http://localhost:3030/health

## 🆘 Need Help?

1. Check logs: `docker compose logs`
2. Verify config: `cat .env`
3. Check health: `docker compose ps`
4. Read full docs: `README.md`

---

**Tip**: Use `./switch-env.sh` to quickly switch between environments!
