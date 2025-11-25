# MongoDB Atlas Configuration Guide

This guide explains how to use MongoDB Atlas (cloud database) instead of a local MongoDB container.

## Current Configuration

Your MongoDB Atlas URL has been configured:
```
mongodb+srv://mohaamedtariq12_db_user:wuiAicRs8kWVej08@cluster0.pdmzujy.mongodb.net/devopsians?retryWrites=true&w=majority&appName=Cluster0
```

## Deployment Options

### Option 1: Using MongoDB Atlas (Recommended for Production)

Use the `docker-compose.atlas.yml` file which excludes the MongoDB container:

```bash
# Production deployment with MongoDB Atlas
docker-compose -f docker-compose.atlas.yml up -d

# Or using the deploy script
./deploy.sh production
```

**Benefits:**
- No need to manage MongoDB infrastructure
- Automatic backups and scaling
- Better performance and reliability
- Reduced local resource usage

### Option 2: Using Local MongoDB (Development)

Use the regular `docker-compose.yml` file which includes a MongoDB container:

```bash
# Local development with containerized MongoDB
docker-compose up -d
```

## Environment Files

The MongoDB Atlas URL is configured in:

1. **`.env`** - Current active environment (uses Atlas)
2. **`.env.production`** - Production configuration (uses Atlas)
3. **`.env.example`** - Template with both options documented

## Configuration Details

### For MongoDB Atlas:
```env
MONGO_URL=mongodb+srv://mohaamedtariq12_db_user:wuiAicRs8kWVej08@cluster0.pdmzujy.mongodb.net/devopsians?retryWrites=true&w=majority&appName=Cluster0
```

### For Local MongoDB:
```env
MONGO_URL=mongodb://admin:adminpassword@mongodb:27017/devopsians?authSource=admin
```

## Switching Between Configurations

### To use MongoDB Atlas:
1. Update your `.env` file with the Atlas URL
2. Use `docker-compose.atlas.yml` for deployment
3. Or comment out the MongoDB service in regular `docker-compose.yml`

### To use Local MongoDB:
1. Update your `.env` file with local MongoDB URL
2. Use regular `docker-compose.yml`

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit credentials to Git**
   - The `.env` files should be in `.gitignore`
   - Use `.env.example` as a template without real credentials

2. **Rotate credentials regularly**
   - Change MongoDB Atlas password periodically
   - Update the connection string when credentials change

3. **Network Access**
   - Ensure your server's IP is whitelisted in MongoDB Atlas
   - Consider using IP whitelisting or VPC peering

4. **Use environment variables**
   - Never hardcode database URLs in application code
   - Always use `process.env.MONGO_URL`

## Testing the Connection

After deployment, check if the backend can connect to MongoDB Atlas:

```bash
# Check backend logs
docker logs devopsians-backend-production

# Check health endpoint
curl http://localhost:3030/health
```

## Troubleshooting

### Connection Issues

1. **Check IP Whitelist**: Ensure your server's IP is whitelisted in MongoDB Atlas
2. **Verify Credentials**: Make sure the username and password are correct
3. **Network Connectivity**: Test connection from the container:
   ```bash
   docker exec -it devopsians-backend-production node -e "console.log(process.env.MONGO_URL)"
   ```

### Performance Issues

1. **Choose nearest region**: Deploy to a region close to your MongoDB cluster
2. **Connection pooling**: Ensure your application uses connection pooling
3. **Index optimization**: Create appropriate indexes in MongoDB Atlas

## Additional Resources

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [MongoDB Connection Strings](https://docs.mongodb.com/manual/reference/connection-string/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
