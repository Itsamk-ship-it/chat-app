FROM mirror.gcr.io/library/node:20-alpine

# Install build tools for native modules (bcrypt)
RUN apk add --no-cache python3 make g++ linux-headers

WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Use npm install for maximum compatibility in this specific repo
# --legacy-peer-deps handles potential dependency conflicts
RUN npm install --legacy-peer-deps

# Copy the rest of the application
COPY . .

# Production environment settings
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

# The app is a plain JS Express app (src/index.js), no build step needed.
# We use a simple CMD to avoid shell redirection issues seen in previous attempts

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
