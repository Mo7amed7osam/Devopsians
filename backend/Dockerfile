# Backend Dockerfile for Node.js Express API
# Multi-stage not strictly necessary here; keep it simple and small

FROM node:20-alpine

# Set working directory for backend
WORKDIR /app/backend

# Copy only backend package files and install production deps
COPY backend/package*.json ./
# Prefer clean install if lockfile exists, otherwise regular install
RUN if [ -f package-lock.json ]; then npm ci --omit=dev --legacy-peer-deps; else npm install --omit=dev --legacy-peer-deps; fi

# Copy backend source code
COPY backend/. .

# Expose backend port
EXPOSE 3030

ENV NODE_ENV=production

# Start the server
CMD ["node", "index.js"]
