# Dockerfile for LSH Daemon (Node.js)
#
# This Dockerfile builds the LSH (Long-running Service Host) daemon,
# a powerful job scheduler and API service built with Node.js/TypeScript.
#
# Usage:
#   docker build -t lsh-daemon .
#   docker run -p 3030:3030 --env-file .env lsh-daemon
#
# For fly.io deployment, see config/fly.toml

FROM node:20.18.0-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --production=false

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Create necessary directories
RUN mkdir -p /data

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3030
ENV LSH_API_ENABLED=true
ENV LSH_API_PORT=3030

# Expose port
EXPOSE 3030

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3030/health || exit 1

# Create non-root user for security
# Note: node user (UID 1000) already exists in node:20.18.0-slim base image
# We'll use the existing node user instead
RUN chown -R node:node /app /data

# Switch to non-root user
USER node

# Run LSH simple API server (lightweight Express server without dependencies)
CMD ["node", "dist/simple-api-server.js"]

# =============================================================================
# Build Instructions
# =============================================================================

# Local build and test:
#   docker build -t lsh-daemon .
#   docker run -p 3030:3030 --env-file .env lsh-daemon

# Test the running container:
#   curl http://localhost:3030/health
#   curl http://localhost:3030/api/status

# Deploy to fly.io:
#   fly deploy -a mcli-lsh-daemon

# =============================================================================
# Multi-stage build option (smaller production image)
# =============================================================================

# Uncomment for optimized production build:

# FROM node:20.18.0-slim as builder
# WORKDIR /app
# COPY package*.json ./
# RUN npm ci
# COPY . .
# RUN npm run build

# FROM node:20.18.0-slim
# WORKDIR /app
# COPY --from=builder /app/dist ./dist
# COPY --from=builder /app/node_modules ./node_modules
# COPY --from=builder /app/package.json ./
# ENV NODE_ENV=production
# ENV PORT=3030
# EXPOSE 3030
# RUN useradd -m -u 1000 lsh && chown -R lsh:lsh /app
# USER lsh
# CMD ["node", "dist/app.js"]

# =============================================================================
# Environment Variables
# =============================================================================

# Required (set via fly secrets or .env):
# - SUPABASE_URL: Supabase project URL
# - SUPABASE_KEY: Supabase service role key
# - LSH_API_KEY: API authentication key (optional)
#
# Optional:
# - PORT: Port to listen on (default: 3030)
# - NODE_ENV: Environment (default: production)
# - LOG_LEVEL: Logging level (default: info)
# - DATABASE_URL: PostgreSQL connection string (if using Postgres)
# - REDIS_URL: Redis connection string (if using Redis)

# =============================================================================
# Volumes
# =============================================================================

# For persistent data storage:
# VOLUME /data

# =============================================================================
# Security Notes
# =============================================================================

# - Runs as non-root user (lsh)
# - Production dependencies only
# - No sensitive data baked into image
# - Secrets passed via environment variables
# - Health checks for reliability
# - Minimal attack surface (slim base image)

# =============================================================================
# Troubleshooting
# =============================================================================

# If build fails:
# 1. Check Node version matches .nvmrc
# 2. Verify package.json and package-lock.json are present
# 3. Test build locally: npm run build
# 4. Check for TypeScript errors

# If container fails to start:
# 1. Check logs:           docker logs <container_id>
# 2. Verify environment:   docker inspect <container_id>
# 3. Test locally:         npm start
# 4. Check dist/app.js exists

# Debug mode:
# docker run -it --entrypoint /bin/bash lsh-daemon
# Then: node dist/app.js

# =============================================================================
# Performance Tuning
# =============================================================================

# For production with high load:
# - Use PM2 for process management
# - Enable clustering
# - Add Redis for caching
# - Configure connection pooling

# Example with PM2:
# RUN npm install -g pm2
# CMD ["pm2-runtime", "dist/app.js", "-i", "max"]
