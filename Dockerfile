FROM mirror.gcr.io/library/node:20-alpine

# Install build tools for native modules (bcrypt)
RUN apk add --no-cache python3 make g++ linux-headers

WORKDIR /app

# Install backend dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy the backend application
COPY . .

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

# DATABASE_URL / REDIS_URL are injected at runtime by nexlayer.yaml using
# ${postgres-db:5432} / ${redis-cache:6379} inter-pod interpolation, so no
# service-discovery shell hack is needed here.
CMD ["node", "src/index.js"]
