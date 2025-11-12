# Jenkins Quick Start Guide

## ✅ Problem Fixed
**Jenkinsfile is now in the root directory** - Jenkins will find it automatically!

## 🚀 Quick Setup (5 Steps)

### 1. Add Credentials in Jenkins
Navigate to: **Manage Jenkins** → **Credentials** → **Global credentials** → **Add Credentials**

Create these 3 credentials:

| ID | Type | Value |
|---|---|---|
| `dockerhub-credentials` | Username with password | DockerHub username & password |
| `ec2-ssh-key` | SSH Username with private key | EC2 .pem key |
| `mongo-url` | Secret text | MongoDB connection string |

### 2. Update Jenkinsfile Variables
Edit `Jenkinsfile` lines 6-9:
```groovy
DOCKERHUB_USERNAME = 'YOUR_DOCKERHUB_USERNAME'
EC2_HOST = 'YOUR_EC2_PUBLIC_IP'
EC2_USER = 'ubuntu'
```

### 3. Create Pipeline Job
1. **New Item** → Enter name → **Pipeline** → **OK**
2. **Pipeline** section:
   - Definition: **Pipeline script from SCM**
   - SCM: **Git**
   - Repository URL: `https://github.com/Devopsians12/Devopsians.git`
   - Branch: `*/main`
   - Script Path: `Jenkinsfile`
3. **Save**

### 4. Prepare EC2 Instance
```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# Install Docker
sudo apt update
sudo apt install -y docker.io docker-compose
sudo usermod -aG docker ubuntu
sudo systemctl start docker

# Logout and login again for docker group to take effect
exit
```

### 5. Run Pipeline
Click **Build Now** and monitor in **Console Output**

## 🔍 Verify Deployment
After successful build:
- Frontend: `http://YOUR_EC2_IP`
- Backend: `http://YOUR_EC2_IP:3030`

## ⚠️ Common Issues

| Error | Solution |
|---|---|
| Cannot find Jenkinsfile | Already fixed - it's in root now |
| SSH connection failed | Check EC2 security group allows port 22 |
| Docker permission denied | Run `sudo usermod -aG docker ubuntu` on EC2 |
| Port already in use | Pipeline automatically stops old containers |

## 📚 Full Documentation
See [JENKINS_SETUP.md](../JENKINS_SETUP.md) for detailed instructions.

## 🔗 Repository Structure
```
Devopsians/
├── Jenkinsfile          ← Jenkins finds it here (root)
├── JENKINS_SETUP.md     ← Full documentation
├── Deploy/
│   ├── docker-compose.yml
│   └── Jenkinsfile      ← Old location (backup)
├── backend/
└── frontend/
```
