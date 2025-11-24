# 🚀 Deployment Checklist

Use this checklist to ensure proper deployment setup.

## 📋 Pre-Deployment

### Development Environment
- [ ] Docker and Docker Compose installed
- [ ] Copied `.env.development` to `.env` (or used switch-env script)
- [ ] Reviewed and updated environment variables in `.env`
- [ ] Ports 3000, 3030, 27017 are available

### Staging Environment
- [ ] Docker and Docker Compose installed on staging server
- [ ] Copied `.env.staging` to `.env`
- [ ] Updated all credentials in `.env.staging`
- [ ] Changed default MongoDB passwords
- [ ] Changed JWT secret key
- [ ] Updated FRONTEND_URL and VITE_API_URL
- [ ] Ports 80, 3030, 27017 are available
- [ ] Firewall configured for required ports

### Production Environment
- [ ] Docker and Docker Compose installed on production server
- [ ] Copied `.env.production` to `.env`
- [ ] **CRITICAL**: Changed all default passwords
- [ ] **CRITICAL**: Generated strong JWT secret (use `openssl rand -base64 32`)
- [ ] **CRITICAL**: Updated all URLs to production domains
- [ ] Configured DNS records
- [ ] SSL/TLS certificates ready
- [ ] Reverse proxy configured (nginx/traefik)
- [ ] Backup strategy in place
- [ ] Monitoring setup (optional but recommended)
- [ ] Firewall rules configured
- [ ] Ports 80, 443, 3030 are available (or configured accordingly)

## 🔐 Security Checklist

- [ ] All default passwords changed
- [ ] JWT secret is strong and unique
- [ ] MongoDB credentials are strong
- [ ] `.env` file is in `.gitignore`
- [ ] No credentials committed to Git
- [ ] Environment-specific secrets used
- [ ] HTTPS enabled in production
- [ ] Database backups configured

## 🛠️ Deployment Steps

### 1. Environment Selection
```bash
# Option A: Use switch script
./switch-env.sh  # Linux/Mac
switch-env.bat   # Windows

# Option B: Manual copy
cp .env.production .env
```

- [ ] Environment file copied/selected

### 2. Configuration Review
```bash
# Review current settings
cat .env  # Linux/Mac
type .env # Windows
```

- [ ] All required variables set
- [ ] URLs are correct
- [ ] Credentials are secure
- [ ] Ports are correct

### 3. Deploy Services
```bash
# Use deployment script
./deploy.sh       # Linux/Mac
deploy.bat        # Windows

# Or manual deployment
docker compose pull
docker compose down
docker compose up -d
```

- [ ] Deployment script executed successfully
- [ ] No errors during startup

### 4. Verify Deployment
```bash
# Check service status
docker compose ps

# Check health
curl http://localhost:3030/health

# Or use monitor script
./monitor.sh      # Linux/Mac
monitor.bat       # Windows
```

- [ ] All services show "Up" status
- [ ] All services report "healthy"
- [ ] Backend health endpoint responds
- [ ] Frontend loads successfully
- [ ] MongoDB is accessible

### 5. Test Application
- [ ] Frontend loads in browser
- [ ] Can register new user
- [ ] Can login
- [ ] Backend API responds correctly
- [ ] Database operations work
- [ ] All features functional

## 📊 Post-Deployment

### Monitoring Setup
- [ ] Log rotation configured
- [ ] Resource monitoring active
- [ ] Health checks passing
- [ ] Alerts configured (if applicable)

### Documentation
- [ ] Deployment details documented
- [ ] Access credentials securely stored
- [ ] Team members notified
- [ ] Rollback procedure documented

### Backup
```bash
# Backup MongoDB
docker exec devopsians-mongodb mongodump --out=/data/backup
docker cp devopsians-mongodb:/data/backup ./backup-$(date +%Y%m%d)
```

- [ ] Initial database backup created
- [ ] Backup schedule configured
- [ ] Backup restoration tested

## 🔄 Update Checklist

When updating the application:

- [ ] Backup current database
- [ ] Pull latest images: `docker compose pull`
- [ ] Review changelog for breaking changes
- [ ] Update environment variables if needed
- [ ] Deploy: `docker compose up -d`
- [ ] Verify health: `docker compose ps`
- [ ] Test critical functionality
- [ ] Monitor logs for errors

## 🆘 Troubleshooting Checklist

If deployment fails:

- [ ] Check logs: `docker compose logs`
- [ ] Verify `.env` file exists and is correct
- [ ] Check port conflicts: `netstat -ano | findstr :PORT`
- [ ] Verify Docker is running: `docker ps`
- [ ] Check disk space: `df -h`
- [ ] Verify network connectivity
- [ ] Review Docker Compose file syntax
- [ ] Check service dependencies
- [ ] Verify image availability
- [ ] Check resource limits

## 📝 Environment-Specific Notes

### Development
- Use for local testing
- Longer JWT expiry for convenience
- Debug logging enabled
- Development database

### Staging
- Mirror production setup
- Test all changes here first
- Separate database from production
- Can use production-like data (anonymized)

### Production
- **Never test directly in production**
- Use strong credentials
- Enable monitoring
- Regular backups
- Minimal logging (performance)
- HTTPS required

## ✅ Success Criteria

Deployment is successful when:

- [ ] All services are "Up" and "healthy"
- [ ] Frontend is accessible at configured URL
- [ ] Backend API responds at `/health` endpoint
- [ ] Database is accessible and functional
- [ ] User can register and login
- [ ] No errors in logs (warnings acceptable)
- [ ] All core features work as expected
- [ ] Performance is acceptable
- [ ] Security measures in place

## 📞 Rollback Procedure

If issues occur after deployment:

1. [ ] Stop current containers: `docker compose down`
2. [ ] Restore previous environment file
3. [ ] Restore database backup if needed
4. [ ] Deploy previous version
5. [ ] Verify rollback successful
6. [ ] Document issue for review

---

**Remember**: Always test in development/staging before production!

**Pro Tip**: Keep this checklist handy for each deployment and mark items as you complete them.
