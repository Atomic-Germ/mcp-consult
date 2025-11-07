FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy built files
COPY dist/ ./dist/

# Expose port if needed (for HTTP transport, but we're using stdio)
# EXPOSE 3000

# Run the server
CMD ["node", "dist/index.js"]