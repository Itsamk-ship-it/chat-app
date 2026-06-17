FROM mirror.gcr.io/library/node:22-slim

# Install build tools for native modules (bcrypt) - using slim instead of alpine to avoid libc incompatibilities
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install dependencies - using --legacy-peer-deps as requested by escalation hint
# We avoid npm ci here to allow legacy-peer-deps to resolve conflicts that might be in the lockfile
RUN npm install --legacy-peer-deps

# Copy the rest of the application
COPY . .

# Production environment settings
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

# The app is a plain JS Express app (src/index.js)
# We use a minimal entrypoint that doesn't attempt complex regex on ROOT_URL
# We rely on the platform to inject necessary env vars or the user to set them in nexlayer.yaml
# But we provide a basic shell wrapper to ensure environment variables are processed
RUN printf '%s\n' "#!/bin/sh\necho 'Starting Express app on port $PORT...$\nexec "$@"" > /nx-start.sh && chmod +x /nx-start.sh

ENTRYPOINT ["/bin/sh", "/nx-start.sh"]
CMD ["node", "src/index.js"]