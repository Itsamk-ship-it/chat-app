FROM mirror.gcr.io/library/node:22-alpine

# Install build tools for native modules like bcrypt
RUN apk add --no-cache python3 make g++ linux-headers

WORKDIR /app

COPY package*.json ./

# Use npm ci since package-lock.json is present
RUN npm ci

COPY . .

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

EXPOSE 3001

# Entrypoint is backend/index.js (package.json "main"); there is no src/ directory.
# DATABASE_URL / REDIS_URL are injected via nexlayer.yaml using <podName>.pod:<port>.
CMD ["node", "backend/index.js"]
