# Jenkins CI/CD Setup Guide

## Problem Fixed
The Jenkinsfile has been moved from `Deploy/` directory to the **root directory** of the repository so Jenkins can find it automatically.

## Prerequisites

1. **Jenkins Server** installed and running
2. **Docker** installed on Jenkins server (if building locally) or on EC2
3. **Git** installed on Jenkins server
4. **Required Jenkins Plugins**:
   - Pipeline
   - Git Plugin
   - Docker Pipeline
   - Credentials Binding Plugin
   - SSH Agent Plugin

## Step 1: Install Required Jenkins Plugins

1. Go to Jenkins Dashboard → **Manage Jenkins** → **Manage Plugins**
2. Go to **Available** tab and install:
   - Pipeline
   - Git Plugin
   - Docker Pipeline
   - Credentials Binding Plugin
   - SSH Agent Plugin
3. Restart Jenkins after installation

## Step 2: Configure Jenkins Credentials

### 2.1 DockerHub Credentials
1. Go to **Manage Jenkins** → **Credentials** → **System** → **Global credentials**
2. Click **Add Credentials**
3. Select **Username with password**
   - **ID**: `dockerhub-credentials`
   - **Username**: Your DockerHub username
   - **Password**: Your DockerHub password/access token
4. Click **OK**

### 2.2 EC2 SSH Key
1. Go to **Manage Jenkins** → **Credentials** → **System** → **Global credentials**
2. Click **Add Credentials**
3. Select **SSH Username with private key**
   - **ID**: `ec2-ssh-key`
   - **Username**: `ubuntu` (or your EC2 username)
   - **Private Key**: Enter directly or from file (your EC2 `.pem` key)
4. Click **OK**

### 2.3 MongoDB URL
1. Go to **Manage Jenkins** → **Credentials** → **System** → **Global credentials**
2. Click **Add Credentials**
3. Select **Secret text**
   - **ID**: `mongo-url`
   - **Secret**: Your MongoDB connection string (e.g., `mongodb+srv://user:pass@cluster.mongodb.net/dbname`)
4. Click **OK**

## Step 3: Create Jenkins Pipeline Job

### Option A: Using Blue Ocean (Recommended)
1. Install **Blue Ocean** plugin if not already installed
2. Click **Open Blue Ocean** from Jenkins dashboard
3. Click **New Pipeline**
4. Select **GitHub**
5. Enter your GitHub credentials/token
6. Select organization: **Devopsians12**
7. Select repository: **Devopsians**
8. Click **Create Pipeline**

### Option B: Traditional Pipeline
1. Go to Jenkins Dashboard
2. Click **New Item**
3. Enter name: `Devopsians-Pipeline`
4. Select **Pipeline**
5. Click **OK**
6. In the **Pipeline** section:
   - **Definition**: Pipeline script from SCM
   - **SCM**: Git
   - **Repository URL**: `https://github.com/Devopsians12/Devopsians.git`
   - **Credentials**: (Add GitHub credentials if private repo)
   - **Branch Specifier**: `*/main`
   - **Script Path**: `Jenkinsfile` (should be in root now)
7. Click **Save**

## Step 4: Configure Environment Variables (Optional)

If you need to override default values, go to your pipeline configuration:
1. Scroll to **Pipeline** section
2. Check **This project is parameterized**
3. Add parameters:
   - `DOCKERHUB_USERNAME` (String)
   - `EC2_HOST` (String)
   - `IMAGE_TAG` (String) - defaults to BUILD_NUMBER

## Step 5: Update Jenkinsfile Variables

Edit the `Jenkinsfile` in the root directory and update these values:

```groovy
environment {
    DOCKERHUB_USERNAME = 'mohamedtarek123'  // Change to your DockerHub username
    EC2_HOST = '56.228.11.117'              // Change to your EC2 public IP
    EC2_USER = 'ubuntu'                     // Change if using different user
}
```

## Step 6: Prepare EC2 Instance

### 6.1 Install Docker on EC2
```bash
sudo apt update
sudo apt install -y docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu
```

### 6.2 Configure Security Group
Open these ports in your EC2 Security Group:
- **Port 80** (HTTP) - Frontend
- **Port 3030** - Backend API
- **Port 22** (SSH) - For Jenkins deployment

### 6.3 Test SSH Connection
From Jenkins server (or your local machine):
```bash
ssh -i /path/to/key.pem ubuntu@YOUR_EC2_IP
```

## Step 7: Run the Pipeline

1. Go to your pipeline job
2. Click **Build Now**
3. Monitor the build in **Console Output**

## Pipeline Stages Explained

1. **Checkout**: Clones the repository from GitHub
2. **Build images on EC2**: 
   - Copies project files to EC2
   - Builds Docker images on EC2
   - Tags images with build number and 'latest'
3. **Login & Push images**: Pushes images to DockerHub
4. **Deploy on EC2 via SSH**: 
   - Deploys using docker-compose
   - Creates environment file
   - Performs health checks

## Troubleshooting

### Issue: "Unable to find Jenkinsfile"
**Solution**: Jenkinsfile must be in the root directory (already fixed)

### Issue: SSH Connection Failed
- Verify EC2 security group allows port 22 from Jenkins IP
- Check SSH key permissions: `chmod 400 key.pem`
- Verify EC2_HOST IP is correct

### Issue: Docker Build Failed
- Check Docker is installed on EC2
- Verify user has Docker permissions: `sudo usermod -aG docker ubuntu`
- Log out and back in after adding user to docker group

### Issue: Port Already in Use
The pipeline automatically stops containers using ports 80 and 3030 before deploying.

### Issue: Containers Not Starting
Check logs:
```bash
ssh ubuntu@EC2_IP
docker logs devopsians-backend
docker logs devopsians-frontend
```

## Manual Deployment (Without Jenkins)

If you need to deploy manually:

```bash
# On your local machine
docker build -t yourusername/devopsians-backend:latest -f backend/Dockerfile .
docker build -t yourusername/devopsians-frontend:latest -f frontend/Dockerfile .
docker push yourusername/devopsians-backend:latest
docker push yourusername/devopsians-frontend:latest

# On EC2
export DOCKERHUB_USERNAME=yourusername
export MONGO_URL="your-mongodb-url"
export FRONTEND_URL="http://YOUR_EC2_IP"
docker-compose up -d
```

## Webhooks (Optional)

To trigger builds automatically on push:

1. Go to your GitHub repository
2. Navigate to **Settings** → **Webhooks**
3. Click **Add webhook**
4. **Payload URL**: `http://YOUR_JENKINS_URL/github-webhook/`
5. **Content type**: `application/json`
6. **Events**: Select "Just the push event"
7. Click **Add webhook**

Then in Jenkins pipeline configuration:
- Check **GitHub hook trigger for GITScm polling**

## Access Your Application

After successful deployment:
- **Frontend**: http://YOUR_EC2_IP
- **Backend API**: http://YOUR_EC2_IP:3030

## Notes

- The Jenkinsfile is configured for Windows-based Jenkins agents (uses `bat` commands)
- If your Jenkins is on Linux, you may need to replace `bat` with `sh` commands
- Build numbers are used as image tags for version tracking
- Environment variables are stored securely in Jenkins credentials
