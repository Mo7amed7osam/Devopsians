#!/bin/bash
set -e

STATIC_IP="34.228.5.183"

echo "🔀 Updating ingress with TLS..."

# Apply ingress with TLS configuration
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: devopsians-ingress
  namespace: devopsians
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - $STATIC_IP
    secretName: devopsians-tls
  rules:
  - http:
      paths:
      # Frontend SPA + assets
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
      # Backend HTTP API: /user/... -> backend
      - path: /user
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 3030
      # Socket.IO endpoint
      - path: /socket.io
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 3030
EOF

echo ""
echo "✅ Ingress updated with TLS!"
echo ""
echo "🌐 Your app will be accessible at: https://$STATIC_IP"
echo "   (Accept the self-signed certificate warning in your browser)"
