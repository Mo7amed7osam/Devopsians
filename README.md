# CareSync

**Real-time ICU reservation and emergency transport coordination platform**

CareSync connects patients, ambulance crews, hospital receptionists, managers, and system administrators through a unified web application — enabling seamless end-to-end coordination of ICU bed reservations, ambulance dispatch, and patient admission lifecycle management.

---

## Quick Links

| Resource | Location |
|---|---|
| 📄 Technical Documentation | [`docs/TECHNICAL_DOCUMENTATION.md`](docs/TECHNICAL_DOCUMENTATION.md) |
| 🏗️ Architecture & Deployment | [`Deploy/ARCHITECTURE.md`](Deploy/ARCHITECTURE.md) |
| 🚀 Deployment Guide | [`Deploy/COMPLETE_GUIDE.md`](Deploy/COMPLETE_GUIDE.md) |
| ☁️ MongoDB Atlas Setup | [`Deploy/MONGODB_ATLAS_SETUP.md`](Deploy/MONGODB_ATLAS_SETUP.md) |
| ✅ Deployment Checklist | [`Deploy/DEPLOYMENT_CHECKLIST.md`](Deploy/DEPLOYMENT_CHECKLIST.md) |

---

## Overview

| Property | Value |
|---|---|
| **Platform type** | Healthcare SaaS |
| **Frontend** | React 18.2 + Vite 5.4 |
| **Backend** | Node.js + Express 4.21 |
| **Database** | MongoDB 7 |
| **Real-time** | Socket.IO 4.8 |
| **Containerization** | Docker + Docker Compose |
| **CI/CD** | GitHub Actions |
| **Cloud** | AWS EC2 / EKS (us-east-1) |
| **Reverse proxy** | Nginx |

---

## User Roles

| Role | Responsibilities |
|---|---|
| **Admin** | Manage hospitals, create manager/admin accounts, block/unblock users |
| **Manager** | Register ICU rooms, manage receptionists, oversee hospital operations |
| **Receptionist** | Approve ICU requests, check-in/check-out patients, manage fees |
| **Patient** | Reserve ICU beds, request ambulances, track transport, provide feedback |
| **Ambulance** | Accept pickup requests, update transport status in real time |

---

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 20+
- A MongoDB instance (local or MongoDB Atlas)

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/Mo7amed7osam/CareSync.git
cd CareSync

# 2. Copy the example environment file
cp Deploy/.env.example Deploy/.env.development

# 3. Start all services with Docker Compose
cd Deploy
docker compose -f docker-compose.local.yml up --build

# Services will be available at:
#   Frontend:  http://localhost
#   Backend:   http://localhost:3030
#   MongoDB:   localhost:27017
```

### Environment Variables

Copy `Deploy/.env.example` and fill in the required values:

```env
MONGO_URL=mongodb://admin:password@localhost:27017/caresync
JWT_SECRET_KEY=your-strong-secret-key
FRONTEND_URL=http://localhost
```

See [`docs/TECHNICAL_DOCUMENTATION.md#7-deployment-architecture`](docs/TECHNICAL_DOCUMENTATION.md#7-deployment-architecture) for the full environment variable reference.

---

## API Health Check

```bash
curl http://localhost:3030/health
```

```json
{
  "uptime": 42.3,
  "message": "OK",
  "timestamp": 1741740000000,
  "environment": "development",
  "database": "connected"
}
```

---

## Documentation

Full technical documentation covering system architecture, database design, all API endpoints, security controls, and the deployment pipeline is available in:

📄 **[`docs/TECHNICAL_DOCUMENTATION.md`](docs/TECHNICAL_DOCUMENTATION.md)**

**Contents:**
1. System Overview
2. System Architecture
3. User Roles and Workflows
4. Database Design
5. API Endpoints
6. Real-Time Communication (Socket.IO)
7. Deployment Architecture
8. Security Considerations
9. Future Scalability

---

## License

This project is developed and maintained by the **DevOpsians** team.
