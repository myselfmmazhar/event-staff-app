# Development Dockerfile for Next.js
FROM node:20-alpine AS development

# Install dependencies for Prisma
RUN apk add --no-cache libc6-compat openssl

# Set working directory
WORKDIR /app

# Copy package files and prisma configuration
COPY package*.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy application files
COPY . .

# Generate Prisma Client with explicit schema path
RUN npx prisma generate --schema=./prisma/schema.prisma

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]
