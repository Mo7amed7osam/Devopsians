# Reconnect to EKS Cluster
Write-Host "🔄 Reconnecting to EKS cluster..." -ForegroundColor Cyan

# Update kubeconfig for EKS cluster
Write-Host "`n1️⃣ Updating kubeconfig..." -ForegroundColor Yellow
aws eks update-kubeconfig --name devopsians-cluster --region us-east-1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to update kubeconfig" -ForegroundColor Red
    exit 1
}

# Verify connection
Write-Host "`n2️⃣ Verifying cluster connection..." -ForegroundColor Yellow
kubectl cluster-info

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to connect to cluster" -ForegroundColor Red
    exit 1
}

# Check nodes
Write-Host "`n3️⃣ Checking cluster nodes..." -ForegroundColor Yellow
kubectl get nodes

# Check namespaces
Write-Host "`n4️⃣ Checking namespaces..." -ForegroundColor Yellow
kubectl get namespaces

Write-Host "`n✅ Successfully reconnected to cluster!" -ForegroundColor Green
# Reconnect to EKS Cluster
Write-Host "🔄 Reconnecting to EKS cluster..." -ForegroundColor Cyan

# Update kubeconfig for EKS cluster
Write-Host "`n1️⃣ Updating kubeconfig..." -ForegroundColor Yellow
aws eks update-kubeconfig --name devopsians-cluster --region us-east-1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to update kubeconfig" -ForegroundColor Red
    exit 1
}

# Verify connection
Write-Host "`n2️⃣ Verifying cluster connection..." -ForegroundColor Yellow
kubectl cluster-info

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to connect to cluster" -ForegroundColor Red
    exit 1
}

# Check nodes
Write-Host "`n3️⃣ Checking cluster nodes..." -ForegroundColor Yellow
kubectl get nodes

# Check namespaces
Write-Host "`n4️⃣ Checking namespaces..." -ForegroundColor Yellow
kubectl get namespaces

Write-Host "`n✅ Successfully reconnected to cluster!" -ForegroundColor Green
