#!/bin/bash

echo "🔍 DIAGNOSTIC CHECK"
echo "=================================================="
echo ""

echo "1️⃣ Checking backend pod status..."
kubectl get pods -n devopsians -l app=backend -o wide
echo ""

echo "2️⃣ Backend pod logs (last 50 lines)..."
BACKEND_POD=$(kubectl get pods -n devopsians -l app=backend -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ -n "$BACKEND_POD" ]; then
  kubectl logs -n devopsians "$BACKEND_POD" --tail=50 2>/dev/null || echo "   (No logs available)"
else
  echo "   (No backend pod found)"
fi
echo ""

echo "3️⃣ Backend service endpoints..."
kubectl get endpoints -n devopsians backend-service
echo ""

echo "4️⃣ Describing backend service..."
kubectl describe svc -n devopsians backend-service
echo ""

echo "5️⃣ Checking ingress status..."
kubectl get ingress -n devopsians
echo ""

echo "6️⃣ Describing ingress..."
kubectl describe ingress -n devopsians devopsians-ingress 2>/dev/null || echo "   (Ingress not found)"
echo ""

echo "7️⃣ Checking ingress-nginx controller status..."
kubectl get pods -n ingress-nginx -o wide
echo ""

echo "8️⃣ Checking ingress-nginx service..."
kubectl get svc -n ingress-nginx ingress-nginx-controller
echo ""

echo "9️⃣ All pods in devopsians namespace..."
kubectl get pods -n devopsians -o wide
echo ""

echo "🔟 Describe backend pod for events..."
if [ -n "$BACKEND_POD" ]; then
  kubectl describe pod -n devopsians "$BACKEND_POD"
else
  echo "   (No backend pod to describe)"
fi
