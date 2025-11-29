#!/bin/bash
set -e

# Your static IP
STATIC_IP="34.228.5.183"

echo "🔐 Generating self-signed certificate for Static IP: $STATIC_IP"

# Generate cert with IP as CN and SAN
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /tmp/tls.key -out /tmp/tls.crt \
  -subj "/CN=$STATIC_IP" \
  -addext "subjectAltName=IP:$STATIC_IP"

# Create secret
kubectl create secret tls devopsians-tls \
  -n devopsians \
  --cert=/tmp/tls.crt \
  --key=/tmp/tls.key \
  --dry-run=client -o yaml | kubectl apply -f -

# Cleanup
rm -f /tmp/tls.key /tmp/tls.crt

echo "✅ TLS secret created/updated successfully for IP: $STATIC_IP"
