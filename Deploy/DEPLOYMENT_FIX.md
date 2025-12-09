# Frontend-Backend Connectivity Fix Guide

## Problem Summary

The frontend cannot communicate with the backend when deployed to Kubernetes due to three issues:

1. **Frontend built without API URL** - The Docker image was built without `VITE_API_URL=/api`
2. **Backend CORS blocking requests** - CORS wasn't configured to allow ingress traffic
3. **Cookie security settings** - Secure cookies require HTTPS

## ✅ Fixes Applied

### 1. Backend CORS Configuration
**File**: `k8s/app/backend-secret.yaml`

Added environment variables:
```yaml
CORS_ALLOW_ALL: "true"
SECURE_COOKIES: "false"
```

**File**: `backend/index.js`

Enhanced CORS configuration with:
- Dynamic origin checking
- Better logging for debugging
- Support for ingress proxy scenarios

### 2. Frontend Docker Build

The frontend needs to be **rebuilt** with the correct `VITE_API_URL` environment variable.

## 🔧 How to Fix

### Step 1: Rebuild Frontend Docker Image

From the **project root directory**, run:

```bash
# Build the frontend image with the correct API URL
docker build \
  --build-arg VITE_API_URL=/api \
  -f frontend/Dockerfile \
  -t devopsians/devopsians-frontend:latest \
  .

# Push to DockerHub
docker push devopsians/devopsians-frontend:latest
```

**Important**: The Dockerfile expects to be run from the project root (not the frontend directory) because it uses paths like `COPY frontend/package*.json ./`

### Step 2: Update Kubernetes Secrets

Apply the updated backend secret:

```bash
kubectl apply -f k8s/app/backend-secret.yaml
```

### Step 3: Restart Deployments

Restart both frontend and backend to pick up changes:

```bash
# Restart backend to load new environment variables
kubectl rollout restart deployment/backend -n devopsians

# Restart frontend to pull the new image
kubectl rollout restart deployment/frontend -n devopsians
```

### Step 4: Verify Deployment

Check that pods are running:

```bash
kubectl get pods -n devopsians
```

Wait for both pods to be in `Running` state with `1/1` ready.

## 🧪 Testing

### Test 1: Backend Health Check

```bash
# Get the ingress IP
kubectl get ingress -n devopsians

# Test backend health endpoint
curl http://<INGRESS_IP>/api/health
```

Expected response:
```json
{
  "uptime": 123.45,
  "message": "OK",
  "timestamp": 1234567890,
  "environment": "production",
  "database": "connected"
}
```

### Test 2: CORS Headers

```bash
curl -v -H "Origin: http://<INGRESS_IP>" http://<INGRESS_IP>/api/health
```

Look for these headers in the response:
```
Access-Control-Allow-Origin: http://<INGRESS_IP>
Access-Control-Allow-Credentials: true
```

### Test 3: Frontend Login

1. Open browser and navigate to `http://<INGRESS_IP>`
2. Open Developer Console (F12)
3. Go to Network tab
4. Try to login
5. Check that:
   - Requests go to `/api/user/login-user`
   - Response status is 200 (not 401 or 403)
   - Cookies are set in Application tab

### Test 4: Check Backend Logs

```bash
kubectl logs -n devopsians deployment/backend --tail=50
```

Look for:
```
CORS Configuration: { corsAllowAll: true, allowedOrigins: [...], ... }
CORS: Allowing origin http://... (CORS_ALLOW_ALL=true)
```

## 🔍 Troubleshooting

### Issue: Frontend still can't reach backend

**Check 1**: Verify the frontend was rebuilt with correct API URL

```bash
# Exec into frontend pod
kubectl exec -it -n devopsians deployment/frontend -- sh

# Check the built JavaScript files for API_BASE
grep -r "API_BASE" /usr/share/nginx/html/assets/

# Should show: API_BASE = "/api"
```

**Check 2**: Verify ingress is routing correctly

```bash
# Test from within the cluster
kubectl run -it --rm debug --image=alpine --restart=Never -n devopsians -- sh

# Install curl
apk add curl

# Test backend service directly
curl http://backend-service:3030/health

# Test through ingress
curl http://frontend-service/api/health
```

### Issue: CORS errors in browser console

**Check**: Backend logs for CORS messages

```bash
kubectl logs -n devopsians deployment/backend | grep CORS
```

If you see "CORS: Blocking origin", the `CORS_ALLOW_ALL` setting didn't apply. Verify:

```bash
# Check environment variables in backend pod
kubectl exec -n devopsians deployment/backend -- env | grep CORS
```

### Issue: Cookies not being set

**Cause**: Secure cookies require HTTPS

**Solution**: Either:
1. Set up TLS on your ingress (recommended for production)
2. Keep `SECURE_COOKIES: "false"` in backend-secret.yaml (current setting)

To enable TLS:
```yaml
# In k8s/app/ingress.yaml
spec:
  tls:
  - hosts:
    - your-domain.com
    secretName: devopsians-tls
```

## 📝 Alternative: Quick Test with CORS_ALLOW_ALL

If you want to test immediately without rebuilding the frontend:

1. The backend changes are already applied
2. Just restart the backend:
   ```bash
   kubectl apply -f k8s/app/backend-secret.yaml
   kubectl rollout restart deployment/backend -n devopsians
   ```
3. This will allow CORS from any origin, which may help identify if the issue is CORS-related

However, you'll still need to rebuild the frontend with `VITE_API_URL=/api` for the frontend to make requests to the correct endpoint.

## 🎯 Summary

**Immediate fix**: Apply backend secret changes and restart backend
```bash
kubectl apply -f k8s/app/backend-secret.yaml
kubectl rollout restart deployment/backend -n devopsians
```

**Complete fix**: Rebuild and push frontend image
```bash
docker build --build-arg VITE_API_URL=/api -f frontend/Dockerfile -t devopsians/devopsians-frontend:latest .
docker push devopsians/devopsians-frontend:latest
kubectl rollout restart deployment/frontend -n devopsians
```
