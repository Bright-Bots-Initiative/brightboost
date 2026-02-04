FROM node:20-alpine

WORKDIR /app

# Copy backend manifests first for cache
COPY package*.json ./

# Install deps (include dev deps so tsc is available during build)
RUN npm ci --include=dev

# Copy backend source (this Dockerfile is built with context = backend/)
COPY . .

# Generate Prisma client using backend-local schema
RUN npx prisma generate --schema prisma/schema.prisma

# Compile TypeScript
RUN npx tsc -p .

# Remove dev deps to slim runtime image
RUN npm prune --omit=dev

ENV NODE_ENV=production
EXPOSE 3000

# Start backend (runs predeploy -> seed -> then node dist/src/server.js)
CMD ["npm","run","start"]
