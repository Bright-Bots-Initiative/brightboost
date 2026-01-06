# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app

# Enable pnpm via corepack (no npm installs needed)
RUN corepack enable && corepack prepare pnpm@9.15.1 --activate

# Copy lockfiles + manifests first for better caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/tsconfig.json ./backend/
# Copy script for helpful error messages
COPY scripts/lockfile-help.sh ./scripts/

# Install root deps (frontend + backend via workspace)
RUN pnpm install --frozen-lockfile || (sh scripts/lockfile-help.sh && exit 1)

# Copy rest of repo
COPY . .

# Build frontend (outputs /app/dist)
RUN pnpm run build

# Build backend (outputs /app/backend/dist)
# We use root pnpm install, but scripts must be run inside backend or via prefix
# Since pnpm install was run at root with workspace, backend deps are installed.
RUN pnpm --prefix backend run db:generate \
 && pnpm --prefix backend exec tsc -p tsconfig.json

# ---- runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Copy built frontend + backend output
COPY --from=build /app/dist /app/dist
COPY --from=build /app/backend /app/backend
COPY --from=build /app/prisma /app/prisma
# Copy root package.json and lockfile for runtime install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./


# Install pnpm in runtime
RUN corepack enable && corepack prepare pnpm@9.15.1 --activate

# Install backend deps (needs prisma CLI available) and generate Prisma client
# Using root install with workspace ensures backend deps are installed
RUN pnpm install --frozen-lockfile \
 && pnpm --prefix backend run db:generate

# Railway provides PORT; app must bind to it.
EXPOSE 8080

CMD ["sh", "-lc", "pnpm --prefix backend run db:generate && node backend/dist/src/server.js"]
