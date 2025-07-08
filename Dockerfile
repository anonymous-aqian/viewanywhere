# Multi-stage build - Build stage
FROM node:18-alpine as build-stage

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm install && npm run build

# Production stage
FROM nginx:alpine as production-stage

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy build artifacts from build stage to nginx static files directory
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]