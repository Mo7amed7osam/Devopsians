# Backend Dockerfile for Node.js Express API
# Multi-stage not strictly necessary here; keep it simple and small

FROM node:20-alpine

# Set working directory for backend
WORKDIR /app/backend

# Copy backend package.json
COPY backend/package*.json ./

# Install dependencies directly (workspace setup doesn't have backend/package-lock.json)
RUN npm install --omit=dev --legacy-peer-deps

# Copy backend source code
COPY backend/. .

# Expose backend port
EXPOSE 3030

ENV NODE_ENV=production

# Start the server
CMD ["node", "index.js"]
