# Devopsians

## Deploying with Docker Compose

Prerequisites:
- Docker and Docker Compose installed
- Environment variables for backend
  - MONGO_URL: your MongoDB connection string
  - FRONTEND_URL: public URL of the frontend (e.g., http://localhost or http://<server-ip>)

1. Build images (optional if pulling from registry):
```
# Backend and Frontend images are built by Jenkins; for local build:
docker build -t devopsians-backend:local -f backend/Dockerfile .
docker build -t devopsians-frontend:local -f frontend/Dockerfile .
```

2. Run with Compose:
- Create a `.env` file next to `Deploy/docker-compose.yml` (or export variables):
```
DOCKERHUB_USERNAME=your-dockerhub-user
MONGO_URL=mongodb+srv://...
FRONTEND_URL=http://localhost
```

- Start services:
```
docker compose -f Deploy/docker-compose.yml up -d
```

Frontend: http://localhost
Backend: http://localhost:3030

## Jenkins CI/CD

Jenkinsfile builds and pushes two images:
- `${DOCKERHUB_USERNAME}/devopsians-backend:latest`
- `${DOCKERHUB_USERNAME}/devopsians-frontend:latest`

Then it SSHes into EC2 and runs docker compose with an env file containing:
- DOCKERHUB_USERNAME, MONGO_URL, FRONTEND_URL

Set Jenkins credentials IDs:
- `dockerhub-credentials` (username/password)
- `ec2-ssh-key` (SSH private key)
- `mongo-url` (Secret text or username/password, used as MONGO_URL)

On EC2, the stack is accessible at `http://<EC2_IP>`.
