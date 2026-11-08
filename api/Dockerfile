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
COPY api api
RUN npm ci
RUN npm run build -w @gateflag/core && npm run build -w @gateflag/api \
  && node -e "const fs=require('fs');const p='core/package.json';const j=JSON.parse(fs.readFileSync(p,'utf8'));j.exports={'.':'./dist/index.js'};fs.writeFileSync(p,JSON.stringify(j,null,2));"

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S gateflag && adduser -S gateflag -G gateflag
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/core ./core
COPY --from=build /app/api ./api
USER gateflag
EXPOSE 3003
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD wget -qO- http://localhost:3003/health || exit 1
CMD ["node", "api/dist/index.js"]
