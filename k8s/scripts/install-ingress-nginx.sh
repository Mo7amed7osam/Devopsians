#!/bin/bash
set -e

# Configuration
ELASTIC_IP_ALLOC="eipalloc-0e6d30b23b2316e16"
STATIC_IP="34.228.5.183"
REGION="us-east-1"

echo "📦 Installing ingress-nginx with Static IP: $STATIC_IP"
echo "========================================================"
echo ""

# Pre-flight checks
echo "🔍 Running pre-flight checks..."
echo ""

# Check 1: Verify Elastic IP exists
echo "1️⃣ Checking Elastic IP..."
EIP_STATUS=$(aws ec2 describe-addresses \
  --allocation-ids $ELASTIC_IP_ALLOC \
  --query 'Addresses[0].PublicIp' \
  --output text \
  --region $REGION 2>/dev/null || echo "ERROR")

if [ "$EIP_STATUS" != "$STATIC_IP" ]; then
  echo "❌ Error: Elastic IP not found or doesn't match"
  echo "   Expected: $STATIC_IP"
  echo "   Found: $EIP_STATUS"
  exit 1
fi
echo "✅ Elastic IP verified: $STATIC_IP"

# Check 2: Find public subnet
echo ""
echo "2️⃣ Finding public subnet..."
SUBNET_ID=$(aws ec2 describe-subnets \
  --filters "Name=tag:Name,Values=devopsians-public-subnet-1" \
  --query "Subnets[0].SubnetId" \
  --output text \
  --region $REGION 2>/dev/null || echo "")

if [ -z "$SUBNET_ID" ] || [ "$SUBNET_ID" == "None" ]; then
  echo "❌ Error: Could not find devopsians-public-subnet-1"
  echo "💡 Verify Terraform infrastructure is deployed"
  exit 1
fi
echo "✅ Using subnet: $SUBNET_ID"

# Check 3: Verify node IAM permissions
echo ""
echo "3️⃣ Checking node IAM permissions..."
NODE_ROLE=$(aws eks describe-nodegroup \
  --cluster-name devopsians-eks-cluster \
  --nodegroup-name devopsians-node-group \
  --query 'nodegroup.nodeRole' \
  --output text \
  --region $REGION | cut -d'/' -f2)

ROLE_POLICIES=$(aws iam list-role-policies \
  --role-name $NODE_ROLE \
  --query 'PolicyNames' \
  --output text)

if echo "$ROLE_POLICIES" | grep -q "elb"; then
  echo "✅ ELB IAM permissions found"
else
  echo "⚠️  Warning: ELB IAM policy not found in role"
  echo "   Role: $NODE_ROLE"
  echo "   This might cause LoadBalancer provisioning to fail"
  
  # Check if running in CI/CD mode
  if [ -n "$CI" ]; then
    echo "   Running in CI/CD mode - continuing anyway"
  else
    echo ""
    read -p "Continue anyway? (yes/no): " continue_choice
    if [ "$continue_choice" != "yes" ]; then
      echo "Aborting. Please update Terraform first:"
      echo "  cd terraform && terraform apply"
      exit 1
    fi
  fi
fi


# Check 4: Get node security group
echo ""
echo "4️⃣ Checking node security group..."
NODE_SG=$(aws ec2 describe-instances \
  --filters "Name=tag:eks:cluster-name,Values=devopsians-eks-cluster" \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
  --output text \
  --region $REGION 2>/dev/null || echo "")

if [ -z "$NODE_SG" ] || [ "$NODE_SG" == "None" ]; then
  echo "⚠️  Warning: Could not find node security group"
else
  echo "✅ Node security group: $NODE_SG"
fi

echo ""
echo "========================================================"
echo "Starting installation..."
echo "========================================================"
echo ""

# Delete existing namespace if present
if kubectl get namespace ingress-nginx &>/dev/null; then
  echo "🗑️  Removing existing ingress-nginx namespace..."
  kubectl delete namespace ingress-nginx --wait=true --timeout=60s
  echo "✅ Cleaned up"
  echo ""
  sleep 5
fi

# Create namespace
echo "5️⃣ Creating ingress-nginx namespace..."
kubectl create namespace ingress-nginx

echo ""
echo "6️⃣ Installing ingress-nginx controller..."

# Install controller components (without default service)
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml

# Wait for basic resources to be created
sleep 10

# Delete the default service
kubectl delete svc ingress-nginx-controller -n ingress-nginx --ignore-not-found=true

echo ""
echo "7️⃣ Creating LoadBalancer Service with NLB + Elastic IP..."

# Create custom service with NLB and Elastic IP
# KEY FIX: externalTrafficPolicy: Cluster (not Local) to allow cross-AZ routing
kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-eip-allocations: "$ELASTIC_IP_ALLOC"
    service.beta.kubernetes.io/aws-load-balancer-subnets: "$SUBNET_ID"
  labels:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: ingress-nginx
    app.kubernetes.io/name: ingress-nginx
  name: ingress-nginx-controller
  namespace: ingress-nginx
spec:
  externalTrafficPolicy: Cluster
  ipFamilies:
  - IPv4
  ipFamilyPolicy: SingleStack
  ports:
  - appProtocol: http
    name: http
    port: 80
    protocol: TCP
    targetPort: http
  - appProtocol: https
    name: https
    port: 443
    protocol: TCP
    targetPort: https
  selector:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: ingress-nginx
    app.kubernetes.io/name: ingress-nginx
  type: LoadBalancer
EOF

echo ""
echo "8️⃣ Configuring security group rules..."

if [ -n "$NODE_SG" ] && [ "$NODE_SG" != "None" ]; then
  # Allow HTTP
  aws ec2 authorize-security-group-ingress \
    --group-id $NODE_SG \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0 \
    --region $REGION 2>&1 | grep -v "already exists" || true
  
  # Allow HTTPS
  aws ec2 authorize-security-group-ingress \
    --group-id $NODE_SG \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0 \
    --region $REGION 2>&1 | grep -v "already exists" || true
  
  # Allow NodePort range (for health checks)
  aws ec2 authorize-security-group-ingress \
    --group-id $NODE_SG \
    --protocol tcp \
    --port 30000-32767 \
    --cidr 0.0.0.0/0 \
    --region $REGION 2>&1 | grep -v "already exists" || true
  
  echo "✅ Security group rules configured"
else
  echo "⚠️  Skipped security group configuration (could not find security group)"
fi

echo ""
echo "9️⃣ Waiting for controller pods to be ready..."
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=300s

echo ""
echo "🔟 Waiting for LoadBalancer to be assigned..."
echo "   This can take 2-3 minutes..."
echo ""

# Better wait logic - check for EITHER hostname OR IP
FOUND_LB=false
for i in {1..60}; do
  # Check for IP (NLB with EIP might populate this)
  LB_IP=$(kubectl get svc ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
  
  # Check for hostname (AWS NLB typically returns this even with EIP)
  LB_HOSTNAME=$(kubectl get svc ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")
  
  # Success if we have either IP or hostname
  if [ -n "$LB_IP" ] && [ "$LB_IP" != "null" ]; then
    echo "✅ LoadBalancer ready with IP: $LB_IP"
    FOUND_LB=true
    break
  elif [ -n "$LB_HOSTNAME" ] && [ "$LB_HOSTNAME" != "null" ]; then
    echo "✅ LoadBalancer ready with hostname: $LB_HOSTNAME"
    
    # Verify the EIP is attached via AWS API
    EIP_ATTACHED=$(aws ec2 describe-addresses \
      --allocation-ids $ELASTIC_IP_ALLOC \
      --query 'Addresses[0].AssociationId' \
      --output text \
      --region $REGION 2>/dev/null || echo "")
    
    if [ -n "$EIP_ATTACHED" ] && [ "$EIP_ATTACHED" != "None" ]; then
      echo "✅ Elastic IP is attached! (Association ID: $EIP_ATTACHED)"
      FOUND_LB=true
    fi
    
    if [ "$FOUND_LB" = true ]; then
      break
    fi
  fi
  
  # Progress indicator every 10 seconds
  if [ $((i % 10)) -eq 0 ]; then
    echo "⏳ Still waiting... ($i/60)"
  fi
  
  sleep 5
done

if [ "$FOUND_LB" = false ]; then
  echo ""
  echo "⚠️  LoadBalancer still provisioning (this is normal)"
  echo "   Check status with: kubectl get svc -n ingress-nginx ingress-nginx-controller"
fi

echo ""
echo "1️⃣1️⃣ Waiting for target health checks (30 seconds)..."
sleep 30

# Check target health
echo ""
echo "📊 Checking NLB target health..."
NLB_ARN=$(aws elbv2 describe-load-balancers \
  --query 'LoadBalancers[?Type==`network`].LoadBalancerArn' \
  --output text \
  --region $REGION 2>/dev/null || echo "")

if [ -n "$NLB_ARN" ]; then
  TARGET_GROUPS=$(aws elbv2 describe-target-groups \
    --load-balancer-arn $NLB_ARN \
    --query 'TargetGroups[*].TargetGroupArn' \
    --output text \
    --region $REGION 2>/dev/null || echo "")
  
  if [ -n "$TARGET_GROUPS" ]; then
    for TG in $TARGET_GROUPS; do
      HEALTH_STATUS=$(aws elbv2 describe-target-health \
        --target-group-arn $TG \
        --query 'TargetHealthDescriptions[?TargetHealth.State==`healthy`]' \
        --output text \
        --region $REGION 2>/dev/null || echo "")
      
      if [ -n "$HEALTH_STATUS" ]; then
        echo "✅ At least one target is healthy"
        break
      fi
    done
  fi
fi

echo ""
echo "========================================================"
echo "✅ INSTALLATION COMPLETE"
echo "========================================================"
echo ""
echo "🎯 Your Static IP: $STATIC_IP"
echo "📝 Submit URL: https://$STATIC_IP"
echo ""
echo "📊 Service Status:"
kubectl get svc ingress-nginx-controller -n ingress-nginx
echo ""
echo "🔍 Elastic IP Attachment Status:"
aws ec2 describe-addresses \
  --allocation-ids $ELASTIC_IP_ALLOC \
  --query 'Addresses[0].{PublicIp:PublicIp,Association:AssociationId}' \
  --output table \
  --region $REGION
echo ""
echo "🌐 NLB Status:"
aws elbv2 describe-load-balancers \
  --query 'LoadBalancers[?Type==`network`].{Name:LoadBalancerName,State:State.Code}' \
  --output table \
  --region $REGION 2>/dev/null || echo "Could not fetch NLB info"
echo ""
echo "✅ Test your static IP:"
echo "   curl -I http://$STATIC_IP"
echo ""
echo "📝 Note: Using single-subnet configuration with Cluster traffic policy"
echo "   - Cost optimized (1 Elastic IP = free in first year)"
echo "   - All
