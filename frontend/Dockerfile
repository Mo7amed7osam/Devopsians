# Frontend Dockerfile: build with Node, serve with Nginx

FROM node:20-alpine AS build
WORKDIR /app
# Copy root and frontend to handle workspace and local dependency
COPY . .
WORKDIR /app/frontend
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm ci || npm install
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY ./frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
