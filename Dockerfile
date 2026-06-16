FROM mirror.gcr.io/library/node:22-alpine AS builder

# Install build tools for native modules like bcrypt
RUN apk add --no-cache python3 make g++ linux-headers

WORKDIR /app

COPY package*.json ./

# Use npm ci for deterministic installs
RUN npm ci

COPY . .

# The app is a plain Express API without a build step (src/index.js)
# We just ensure the dependencies are installed. 

FROM mirror.gcr.io/library/node:22-alpine

# Install build tools in runtime for native modules that might be needed at runtime
RUN apk add --no-cache python3 make g++ linux-headers

WORKDIR /app

# Copy everything from builder
COPY --from=builder /app .

# Prune dev dependencies for production
RUN npm prune --production

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

# Keep the existing Nexlayer service discovery wrapper
USER root
RUN printf '%s\n' \
    '#!/bin/sh' \
    'if [ -n "$ROOT_URL" ]; then' \
    '  _h=$(echo "$ROOT_URL" | sed "s|https://||" | sed "s|\.cloud\.nexlayer\.ai||")' \
    '  _d=$(echo "$_h" | cut -d- -f3-)' \
    '  export DATABASE_URL="postgresql://postgres:password@${_d}-postgres-service:5432/chatdb"' \
    '  export REDIS_URL="redis://${_d}-redis-service:6379"' \
    'fi' \
    'exec "$@"' > /nx-start.sh && chmod +x /nx-start.sh

ENTRYPOINT ["/bin/sh", "/nx-start.sh"]
CMD ["node", "src/index.js"]