# 1. Use the actively patched Bun v1 Alpine base
FROM oven/bun:1-alpine AS base
WORKDIR /app

# 2. Update package index and apply latest Alpine security patches
RUN apk update && apk upgrade --no-cache

# 3. Install dependencies first (leverages Docker cache layer)
COPY package.json bun.lock* ./
RUN bun install --production --frozen-lockfile

# 4. Copy source code
COPY . .

# 5. Run as non-root user
USER bun

# 6. Document container port
EXPOSE 3001

# 7. Start Fastify application
CMD ["bun", "run", "index.ts"]