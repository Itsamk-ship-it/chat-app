FROM mirror.gcr.io/library/node:20-alpine

# Install build tools for native modules (bcrypt)
RUN apk add --no-cache python3 make g++ linux-headers

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

# DATABASE_URL / REDIS_URL are injected at runtime by nexlayer.yaml using
# ${postgres-db:5432} / ${redis-cache:6379} inter-pod interpolation.
CMD ["node", "backend/index.js"]
