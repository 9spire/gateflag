# Build context: repository root
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY core/package.json core/
COPY api/package.json api/
COPY react/package.json react/
COPY demo/package.json demo/
COPY e2e/package.json e2e/
COPY tsconfig.base.json tsconfig.json ./
COPY core core
COPY react react
COPY demo demo
RUN npm ci
RUN npm run build -w @gateflag/core \
  && npm run build -w gateflag \
  && VITE_DEMO_MODE=api VITE_BASE_PATH=/ npm run build -w @gateflag/demo

FROM nginx:alpine AS runtime
COPY demo/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/demo/dist /usr/share/nginx/html
EXPOSE 80
