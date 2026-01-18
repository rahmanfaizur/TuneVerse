FROM node:22-alpine AS base

FROM base AS builder
RUN apk add --no-cache libc6-compat
# Set working directory
WORKDIR /app
# Install turbo (pin version to match local)
RUN npm install -g turbo@2.7.3
COPY . .
COPY pnpm-workspace.yaml pnpm-workspace.yaml


# Prune the workspace for the server app!
RUN turbo prune --scope=@tuneverse/server --docker

# Add lockfile and package.json's of isolated subworkspace
FROM base AS installer
RUN apk add --no-cache libc6-compat
WORKDIR /app

# First install dependencies (as they change less often)
COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
# Enable pnpm
RUN corepack enable
RUN pnpm install

# Build the project and its dependencies
COPY --from=builder /app/out/full/ .
COPY --from=builder /app/turbo.json ./turbo.json

# Build the server
RUN pnpm turbo run build --filter=@tuneverse/server...

FROM base AS runner
WORKDIR /app

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs
USER expressjs

COPY --from=installer /app .

CMD ["node", "apps/server/dist/apps/server/src/index.js"]
