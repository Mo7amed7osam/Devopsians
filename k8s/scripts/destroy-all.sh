#!/bin/bash
set -e

echo "🗑️  Devopsians - Destroy All Resources"
echo "======================================"
echo ""
echo "⚠️  WARNING: This will delete:"
echo "   - devopsians namespace (app pods, services, ingress)"
echo "   - monitoring namespace"
echo "   - ingress-nginx namespace (LoadBalancer will be deleted)"
echo ""
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "❌ Aborted."
  exit 0
fi

echo ""
echo "🗑️  Deleting devopsians namespace..."
kubectl delete namespace devopsians --ignore-not-found=true

echo ""
echo "🗑️  Deleting monitoring namespace..."
kubectl delete namespace monitoring --ignore-not-found=true

echo ""
echo "🗑️  Deleting ingress-nginx namespace (this will delete the LoadBalancer)..."
kubectl delete namespace ingress-nginx --ignore-not-found=true

echo ""
echo "⏳ Waiting for resources to be cleaned up..."
echo "   (This may take 1-2 minutes for AWS to delete the LoadBalancer)"

# Wait for namespaces to be fully terminated
for ns in devopsians monitoring ingress-nginx; do
  while kubectl get namespace $ns &>/dev/null; do
    echo "   Still waiting for namespace: $ns"
    sleep 5
  done
done

echo ""
echo "✅ ALL RESOURCES DELETED!"
echo "======================================"
echo ""
echo "🔍 Remaining namespaces:"
kubectl get namespaces
echo ""
echo "💡 To redeploy, run: ./k8s/scripts/full-deploy.sh"
echo "   (You'll need to reinstall ingress-nginx first)"
