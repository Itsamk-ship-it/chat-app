FROM mirror.gcr.io/library/node:22-alpine

# Install build tools for native modules (bcrypt)
RUN apk add --no-cache python3 make g++ linux-headers

WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install all dependencies
# Using --legacy-peer-deps to handle potential conflicts in the lockfile
RUN npm install --legacy-peer-deps

# Copy the rest of the application
COPY . .

# Production environment settings
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

# The app requires DATABASE_URL and REDIS_URL at runtime.
# This wrapper script handles the Nexlayer service discovery pattern,
# converting ROOT_URL into the internal service hostnames for Postgres and Redis.
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