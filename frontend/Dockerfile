# Frontend Dockerfile: build with Node, serve with Nginx

FROM node:20-alpine AS build
WORKDIR /app/frontend
# Only copy frontend package files to install deps
COPY frontend/package*.json ./
RUN npm ci || npm install

# Build arg for API base
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Copy frontend source
COPY frontend/. .
RUN npm run build

FROM nginx:alpine
# Ensure mime.types is properly loaded
RUN test -f /etc/nginx/mime.types || echo "MIME types file missing!"
COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY ./frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
