#!/bin/bash
set -e

# Get the script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🗑️  Uninstalling Prometheus + Grafana Monitoring"
echo "================================================"
echo ""
read -p "⚠️  Are you sure you want to uninstall monitoring? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "❌ Aborted."
  exit 0
fi

echo ""
echo "1️⃣  Uninstalling Helm release..."
helm uninstall prometheus -n monitoring --ignore-not-found

echo ""
echo "2️⃣  Deleting ServiceMonitors..."
kubectl delete -f "$PROJECT_ROOT/k8s/monitoring/servicemonitors.yaml" --ignore-not-found=true

echo ""
echo "3️⃣  Deleting ingress..."
kubectl delete -f "$PROJECT_ROOT/k8s/monitoring/grafana-ingress.yaml" --ignore-not-found=true

echo ""
echo "4️⃣  Deleting PVCs (if any)..."
kubectl delete pvc --all -n monitoring --ignore-not-found=true

echo ""
echo "5️⃣  Deleting TLS secret..."
kubectl delete secret monitoring-tls -n monitoring --ignore-not-found=true

echo ""
echo "6️⃣  Waiting for cleanup to complete..."
sleep 5

echo ""
echo "✅ Monitoring uninstalled successfully!"
echo ""
echo "🔍 Checking remaining resources..."
REMAINING=$(kubectl get all -n monitoring 2>/dev/null | grep -v "^NAME" | wc -l)

if [ "$REMAINING" -eq 0 ]; then
  echo "   ✅ All resources cleaned up!"
else
  echo "   ⚠️  Some resources still exist:"
  kubectl get all -n monitoring
fi

echo ""
echo "💡 To completely remove the namespace, run:"
echo "   kubectl delete namespace monitoring"
echo ""
echo "🔄 To reinstall monitoring, run:"
echo "   ./k8s/scripts/install-monitoring.sh"
