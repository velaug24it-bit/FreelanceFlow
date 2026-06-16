# Build stage for React client
FROM node:18-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Production stage for Node.js server
FROM node:18-alpine
WORKDIR /app

# Copy server files
COPY server/package*.json ./server/
RUN cd server && npm ci --production

COPY server/ ./server/
COPY --from=client-build /app/client/build ./client/build

# Serve React build through Express
ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "server/index.js"]