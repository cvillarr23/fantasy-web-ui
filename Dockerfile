FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
ENV CORE_API_UPSTREAM=fantasy-core-pipeline.default.svc.cluster.local:8000
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 80
