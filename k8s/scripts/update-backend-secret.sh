#!/bin/bash
set -e

# Your static IP (Elastic IP)
STATIC_IP="34.228.5.183"

echo "🔄 Updating backend secret with static IP..."
echo "=============================================="
echo ""
echo "📍 Using Static IP: $STATIC_IP"

# Create updated secret with HTTPS and static IP
cat > /tmp/backend-secret.yaml <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: backend-secret
  namespace: devopsians
type: Opaque
stringData:
  # MongoDB Atlas connection
  MONGO_URL: "mongodb+srv://mohaamedtariq12_db_user:wuiAicRs8kWVej08@cluster0.pdmzujy.mongodb.net/devopsians?retryWrites=true&w=majority&appName=Cluster0"
  
  # JWT / auth settings
  JWT_SECRET_KEY: "devopsians-super-secret-key"
  JWT_EXPIRE: "1d"
  COOKIE_EXPIRE: "1"
  
  # Production mode
  NODE_ENV: "production"
  
  # Frontend URL with STATIC IP (for CORS and Socket.IO)
  FRONTEND_URL: "https://$STATIC_IP"
EOF

echo ""
echo "📝 Applying updated secret..."
kubectl apply -f /tmp/backend-secret.yaml

# Cleanup
rm -f /tmp/backend-secret.yaml

echo ""
echo "✅ Backend secret updated successfully!"
echo ""
echo "📋 Secret contents:"
kubectl get secret backend-secret -n devopsians -o jsonpath='{.data.FRONTEND_URL}' | base64 -d
echo ""
echo ""
echo "💡 Remember to restart backend deployment to apply changes:"
echo "   kubectl rollout restart deployment backend -n devopsians"
