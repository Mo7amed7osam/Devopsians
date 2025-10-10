# Backend Dockerfile for Node.js Express API
# Multi-stage not strictly necessary here; keep it simple and small

FROM node:20-alpine

# Create app directory
WORKDIR /app

# Copy the entire repo as build context to satisfy local "file:.." dependency
# in backend/package.json ("devopsians": "file:..")
COPY . .

# Install only production dependencies for backend
WORKDIR /app/backend
RUN npm install --omit=dev

# Expose backend port
EXPOSE 3030

ENV NODE_ENV=production

# Start the server
CMD ["node", "index.js"]
