FROM mirror.gcr.io/library/node:22-alpine AS builder
WORKDIR /app
# Install build dependencies for native modules like bcrypt
RUN apk add --no-cache python3 make g++ linux-headers
COPY package*.json ./
RUN npm ci
COPY . .

FROM mirror.gcr.io/library/node:22-alpine
WORKDIR /app
# Copy node_modules from builder to runtime
COPY --from=builder /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

# Service discovery script for database and redis pods
USER root
RUN printf '%s\n' \
    '#!/bin/sh' \
    'if [ -n "$ROOT_URL" ]; then' \
    '  _h=$(echo "$ROOT_URL" | sed "s|https://||" | sed "s|\.cloud\.nexlayer\.ai||")' \
    '  _d=$(echo "$_h" | cut -d- -f3-)' \
    '  export DATABASE_URL="postgresql://${_d}-postgres-service:5432/chatdb"' \
    '  export REDIS_URL="redis://${_d}-redis-service:6379"' \
    'fi' \
    'exec "$@"' > /nx-start.sh && chmod +x /nx-start.sh

ENTRYPOINT ["/bin/sh", "/nx-start.sh"]
CMD ["node", "src/index.js"]