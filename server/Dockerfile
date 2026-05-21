FROM node:20-alpine

WORKDIR /app

# Copy server package files
COPY server/package.json ./
RUN npm install --production

# Copy server source
COPY server/src ./src
COPY server/.env.example ./.env

# Copy static files (kiosk + admin)
COPY kiosk ./public/kiosk
COPY admin ./public/admin

# Create data and backup directories
RUN mkdir -p /app/data /app/backups

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "src/index.js"]
