#!/bin/bash
set -e

CLUSTER_NAME="devopsians-eks-cluster"
REGION="us-east-1"

echo "🔗 Connecting to EKS cluster: $CLUSTER_NAME"

aws eks update-kubeconfig --name $CLUSTER_NAME --region $REGION

echo "✅ Connected!"
echo ""
kubectl cluster-info
echo ""
kubectl get nodes