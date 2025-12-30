# ---- build stage ----
FROM node:18-alpine AS build
WORKDIR /app

# Enable pnpm via corepack (no npm installs needed)
RUN corepack enable && corepack prepare pnpm@9.15.1 --activate

# Copy lockfiles + manifests first for better caching
COPY package.json pnpm-lock.yaml ./
COPY backend/package.json backend/pnpm-lock.yaml backend/tsconfig.json ./backend/

# Install root deps (frontend)
RUN pnpm install --frozen-lockfile

# Copy rest of repo
COPY . .

# Build frontend (outputs /app/dist)
RUN pnpm run build

# Build backend (outputs /app/backend/dist)
RUN pnpm --prefix backend install --frozen-lockfile \
 && pnpm --prefix backend run db:generate \
 && pnpm --prefix backend exec tsc -p tsconfig.json

# ---- runtime stage ----
FROM node:18-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Copy built frontend + backend output
COPY --from=build /app/dist /app/dist
COPY --from=build /app/backend /app/backend

# Railway provides PORT; app must bind to it.
EXPOSE 8080

CMD ["node", "backend/dist/src/server.js"]
