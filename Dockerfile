FROM node:22.22.3-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/* \
    && npm ci

FROM dependencies AS development
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM development AS build
ENV NODE_OPTIONS="--dns-result-order=ipv4first"
RUN npm run types && npm run build

FROM node:22.22.3-bookworm-slim AS production
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && npm ci --omit=dev \
    && npm cache clean --force \
    && apt-get purge -y --auto-remove python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/build ./build
COPY scripts/create-admin.mjs ./scripts/create-admin.mjs
COPY server/database/schema.ts ./server/database/schema.ts
RUN mkdir -p /app/server/database/data && chown -R node:node /app/server/database
USER node
EXPOSE 3000
CMD ["npm", "run", "start"]
