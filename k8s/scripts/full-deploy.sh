#!/bin/bash
set -e

STATIC_IP="34.228.5.183"

echo "🚀 Devopsians Full Deployment (Static IP: $STATIC_IP)"
echo "========================================================"
echo ""

# 1. Apply namespace
echo "1️⃣ Creating namespace..."
kubectl apply -f k8s/namespaces.yaml

# 2. Setup TLS
echo ""
echo "2️⃣ Setting up TLS..."
k8s/scripts/setup-tls.sh

# 3. Apply backend secret (now with hardcoded static IP)
echo ""
echo "3️⃣ Applying backend secret..."
kubectl apply -f k8s/app/backend-secret.yaml

# 4. Apply services
echo ""
echo "4️⃣ Creating services..."
kubectl apply -f k8s/app/backend-service.yaml
kubectl apply -f k8s/app/frontend-service.yaml

# 5. Apply deployments
echo ""
echo "5️⃣ Creating deployments..."
kubectl apply -f k8s/app/backend-deployment.yaml
kubectl apply -f k8s/app/frontend-deployment.yaml

# 6. Apply ingress with TLS
echo ""
echo "6️⃣ Creating ingress with TLS..."
k8s/scripts/update-ingress-tls.sh

# 7. Wait for deployments (parallel check)
echo ""
echo "7️⃣ Waiting for deployments to be ready..."
kubectl rollout status deployment/backend -n devopsians --timeout=90s &
BACKEND_PID=$!
kubectl rollout status deployment/frontend -n devopsians --timeout=90s &
FRONTEND_PID=$!

# Wait for both to complete
wait $BACKEND_PID
BACKEND_STATUS=$?
wait $FRONTEND_PID
FRONTEND_STATUS=$?

if [ $BACKEND_STATUS -ne 0 ] || [ $FRONTEND_STATUS -ne 0 ]; then
  echo "⚠️  Warning: Some deployments may not be ready yet"
  echo "   Check status with: kubectl get pods -n devopsians"
fi

# 8. Show final status
echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo "==============================="
echo ""
echo "🎯 Your Static IP: $STATIC_IP"
echo "🌐 Access your app at: https://$STATIC_IP"
echo "   (Accept the self-signed certificate warning in your browser)"
echo ""
echo "📝 Submit this URL for DEPI: https://$STATIC_IP"
echo ""
echo "📊 Pod Status:"
kubectl get pods -n devopsians -o wide
echo ""

# Check if any pods are not running
NOT_RUNNING=$(kubectl get pods -n devopsians -o jsonpath='{.items[?(@.status.phase!="Running")].metadata.name}' | wc -w)
if [ "$NOT_RUNNING" -gt 0 ]; then
  echo "⚠️  WARNING: Some pods are not in Running state!"
  echo "   Run 'kubectl describe pod -n devopsians' for details"
  echo "   Or run k8s/scripts/diagnose.sh for full diagnostics"
fi
echo ""

echo "🔍 Ingress Status:"
kubectl get ingress -n devopsians
echo ""

echo "🌐 LoadBalancer Status:"
kubectl get svc -n ingress-nginx ingress-nginx-controller
