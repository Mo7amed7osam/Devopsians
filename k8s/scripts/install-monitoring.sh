#!/bin/bash
set -e

# Get the script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "📊 Installing Prometheus + Grafana Monitoring Stack"
echo "===================================================="
echo ""

# Check if Helm is installed
if ! command -v helm &> /dev/null; then
    echo "❌ Helm is not installed. Installing..."
    curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
fi

echo "✅ Helm is installed"
echo ""

# Step 1: Add Helm repository
echo "1️⃣  Adding Prometheus Helm repository..."
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts 2>/dev/null || echo "Repository already exists"
helm repo update

echo ""
echo "2️⃣  Installing kube-prometheus-stack (this may take 3-5 minutes)..."

# Install with Helm
helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --values "$PROJECT_ROOT/k8s/monitoring/prometheus-values.yaml" \
  --timeout 10m \
  --wait

echo ""
echo "3️⃣  Waiting for Grafana to be fully ready..."
kubectl wait --for=condition=ready pod \
  --selector=app.kubernetes.io/name=grafana \
  --namespace monitoring \
  --timeout=300s

echo ""
echo "4️⃣  Setting up TLS certificate for monitoring..."

# Copy TLS secret from devopsians namespace if it exists
if kubectl get secret devopsians-tls -n devopsians &>/dev/null; then
  kubectl get secret devopsians-tls -n devopsians -o yaml | \
    sed 's/namespace: devopsians/namespace: monitoring/' | \
    sed 's/name: devopsians-tls/name: monitoring-tls/' | \
    kubectl apply -f - >/dev/null 2>&1
  echo "✅ TLS certificate copied"
else
  echo "⚠️  TLS certificate not found in devopsians namespace"
  echo "   Monitoring will use HTTP only until app is deployed"
  echo "   Run this script again after deploying the application"
fi

echo ""
echo "5️⃣  Creating ingress for Grafana..."
kubectl apply -f "$PROJECT_ROOT/k8s/monitoring/grafana-ingress.yaml"

# Get the ELB hostname
ELB=$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Update Grafana config with proper domain
echo ""
echo "6️⃣  Configuring Grafana for external access..."
kubectl patch configmap prometheus-grafana -n monitoring --type merge -p "{
  \"data\": {
    \"grafana.ini\": \"[analytics]\\ncheck_for_updates = true\\n[grafana_net]\\nurl = https://grafana.net\\n[log]\\nmode = console\\n[paths]\\ndata = /var/lib/grafana/\\nlogs = /var/log/grafana\\nplugins = /var/lib/grafana/plugins\\nprovisioning = /etc/grafana/provisioning\\n[server]\\ndomain = $ELB\\nroot_url = https://$ELB/grafana/\\nserve_from_sub_path = true\\n\"
  }
}" >/dev/null 2>&1

# Restart Grafana to apply config
kubectl rollout restart deployment prometheus-grafana -n monitoring >/dev/null 2>&1
kubectl rollout status deployment prometheus-grafana -n monitoring --timeout=120s >/dev/null 2>&1

echo ""
echo "7️⃣  Creating ServiceMonitors for application monitoring..."
kubectl apply -f "$PROJECT_ROOT/k8s/monitoring/servicemonitors.yaml"

echo ""
echo "8️⃣  Cleaning up completed jobs..."
kubectl delete pod -n ingress-nginx -l app.kubernetes.io/component=admission-webhook --field-selector status.phase=Succeeded --ignore-not-found >/dev/null 2>&1
kubectl delete pod -n monitoring -l app.kubernetes.io/component=admission-webhook --field-selector status.phase=Succeeded --ignore-not-found >/dev/null 2>&1

# Final status check
echo ""
echo "✅ MONITORING INSTALLATION COMPLETE!"
echo "========================================"
echo ""
echo "🌐 Access Grafana:"
echo "   URL: https://$ELB/grafana"
echo "   Username: admin"
echo "   Password: devopsians-admin"
echo ""
echo "📊 Import These Dashboards in Grafana:"
echo "   (Click + in sidebar → Import → Enter Dashboard ID)"
echo ""
echo "   Dashboard ID   Description"
echo "   ------------   -----------"
echo "   315            Kubernetes Cluster Monitoring (Detailed)"
echo "   6417           Kubernetes Cluster Overview"
echo "   1860           Node Exporter Full (CPU, RAM, Disk)"
echo "   13332          Kubernetes API Server Metrics"
echo ""
echo "🔍 Monitoring Status:"
kubectl get pods -n monitoring
echo ""
echo "💡 To uninstall, run:"
echo "   ./k8s/scripts/uninstall-monitoring.sh"
