# --- Stage 1: Node build ---
FROM node:22-alpine AS build
WORKDIR /app

COPY --from=frontend package.json package-lock.json ./
RUN npm ci

COPY --from=frontend . ./
RUN npm run build

# --- Stage 2: Nginx runtime ---
FROM nginx:alpine

COPY nginx.conf /etc/nginx/nginx.conf
COPY templates /etc/nginx/templates

COPY --from=build /app/dist /usr/share/nginx/html
