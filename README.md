# Devopsians
lol
Full‑stack hospital management app with a Node.js/Express + MongoDB backend and a React (Vite) frontend. Dockerfiles and a production docker‑compose stack are included, along with a Jenkins pipeline for CI/CD.

Frontend runs on port 80 (Nginx). Backend API runs on port 3030.

## Documentation

Comprehensive system documentation and the development plan for the ICU Reservation & Management System is available in `docs/ICU_Reservation_Management_System_v1.0.md`.

Open `docs/ICU_Reservation_Management_System_v1.0.md` for feature prioritization, roles, user flows, data model, and a suggested development timeline.

## Tech stack

- Backend: Node.js 20, Express, Mongoose, Socket.IO, JWT, CORS
- Frontend: React 18, Vite, React Router, Socket.IO client
- Infra: Docker, Nginx (for frontend), docker‑compose, Jenkins

## Repository structure

- `backend/` — Express API, routes, models, utils, `Dockerfile`
- `frontend/` — React UI (Vite), `nginx.conf`, `Dockerfile`
- `Deploy/` — Production `docker-compose.yml`, Jenkins pipeline files

## Quickstart: local development (no Docker)

Prereqs:
- Node.js 20 and npm
- MongoDB (local or Atlas connection string)

1) Backend
- Create `backend/.env` with at least:
  - `MONGO_URL=<your MongoDB connection string>`
  - `PORT=3030` (optional, defaults to 3030)
  - `FRONTEND_URL=http://localhost:5173` (for local dev with Vite)
  - `JWT_SECRET` or `JWT_SECRET_KEY` and `JWT_EXPIRE` (see Env Vars section)
  - `COOKIE_EXPIRE=1` (days)
- Install deps and run in dev mode:

```pwsh
cd backend
npm install
npm run dev
```

Backend will listen on http://localhost:3030.

2) Frontend
- Create (optional) `.env.local` in `frontend/` if you want to override the default API base:
  - `VITE_API_URL=http://localhost:3030`
- Install deps and run Vite dev server:

```pwsh
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

Notes
- CORS is restricted to `FRONTEND_URL`. For local dev, make sure it matches the Vite URL (http://localhost:5173).
- Socket.IO uses the same origin allow‑list as CORS via `FRONTEND_URL`.

## Run with Docker (single container builds)

Build images locally:

```pwsh
# From repo root
docker build -t devopsians-backend:local -f backend/Dockerfile .
docker build -t devopsians-frontend:local -f frontend/Dockerfile --build-arg VITE_API_URL=http://localhost:3030 .
```

Run containers:

```pwsh
# Backend API on 3030
docker run -d --name devopsians-backend -p 3030:3030 `
  -e NODE_ENV=production `
  -e PORT=3030 `
  -e MONGO_URL="<your MongoDB connection string>" `
  -e FRONTEND_URL="http://localhost" `
  devopsians-backend:local

# Frontend on 80 (Nginx)
docker run -d --name devopsians-frontend -p 80:80 devopsians-frontend:local
```

Open http://localhost for the UI and the API will be reachable at http://localhost:3030.

## Run with Docker Compose (production stack)

The production stack uses prebuilt images from a Docker registry and lives in `Deploy/docker-compose.yml`.

1) Create an env file `Deploy/.env`:

```
DOCKERHUB_USERNAME=your-dockerhub-user
MONGO_URL=mongodb+srv://...
FRONTEND_URL=http://localhost
```

2) Start the stack:

```pwsh
docker compose -f Deploy/docker-compose.yml --env-file Deploy/.env up -d
```

Services
- Frontend: http://localhost (port 80)
- Backend: http://localhost:3030

Tip: For fully local builds without a registry, either
- build and tag images as `${DOCKERHUB_USERNAME}/devopsians-frontend:latest` and `${DOCKERHUB_USERNAME}/devopsians-backend:latest`, or
- modify `Deploy/docker-compose.yml` to use local `build:` contexts instead of `image:`.

## Environment variables

Backend (Express)
- `MONGO_URL` (required): MongoDB connection string
- `PORT` (default: 3030): API port
- `FRONTEND_URL` (required): Allowed origin for CORS and Socket.IO
- JWT config:
  - `JWT_SECRET` or `JWT_SECRET_KEY`: secret used to sign tokens
  - `JWT_EXPIRE` (default: `1d`): token TTL
  - `COOKIE_EXPIRE` (default: `1`): cookie expiration in days
- `NODE_ENV` (e.g., `development` or `production`)

Frontend (Vite/React)
- `VITE_API_URL`: base URL for the backend API. If not set, defaults to `http://localhost:3030` in `src/utils/api.js`.

Notes
- Ensure the same JWT secret is used consistently across all backend modules that verify/sign tokens.
- In production, cookies are set `SameSite=Strict` and `secure` when `NODE_ENV=production`.

## NPM scripts

Backend (`backend/package.json`)
- `npm run dev`: start with nodemon
- `npm start`: start with node

Frontend (`frontend/package.json`)
- `npm run dev`: Vite dev server
- `npm run build`: production build
- `npm run preview`: preview build on port 5173

## CI/CD with Jenkins

The `Jenkinsfile` builds and pushes two images:
- `${DOCKERHUB_USERNAME}/devopsians-backend:latest`
- `${DOCKERHUB_USERNAME}/devopsians-frontend:latest`

Then it SSHes to the target host and runs docker compose using an env file that contains at least:
- `DOCKERHUB_USERNAME`, `MONGO_URL`, `FRONTEND_URL`

Expected Jenkins credentials/params
- `dockerhub-credentials` (username/password for Docker Hub)
- `ec2-ssh-key` (SSH private key for the target host)
- `DOCKERHUB_USERNAME` (string parameter or env)
- `MONGO_URL` (secret text)
- `FRONTEND_URL` (string parameter)

## Troubleshooting

- CORS errors (403/blocked): Make sure `FRONTEND_URL` matches exactly the site origin (e.g., `http://localhost:5173` for Vite dev, or `http://<server-ip>` behind Nginx).
- Socket.IO not connecting: Same as above—allowed origin must include the frontend origin.
- 401/Authentication issues: Ensure the JWT secret env var matches what your code uses for signing and verifying. Also confirm cookies are being sent by the browser (same site, HTTPS in production).
- Port already in use: Change host port bindings (80/3030) or stop conflicting services.

---

Made with ❤️ by the Devopsians team.
