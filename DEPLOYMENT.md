# ViewAnywhere Deployment Guide

This project provides a complete Docker deployment solution supporting both production and development environments.

## File Overview

- `Dockerfile` - Production multi-stage build configuration
- `Dockerfile.dev` - Development environment configuration
- `docker compose.yml` - Docker Compose orchestration file
- `nginx.conf` - Nginx server configuration
- `.dockerignore` - Docker build ignore file

## Quick Start

### Production Deployment

1. **Build and start services**
   ```bash
   docker compose up -d
   ```

2. **Access the application**
   - Application URL: http://localhost
   - Health check: http://localhost/health

3. **Stop services**
   ```bash
   docker compose down
   ```

### Development Deployment

1. **Start development service**
   ```bash
   docker compose --profile dev up -d viewanywhere-dev
   ```

2. **Access development service**
   - Development URL: http://localhost:5173
   - Hot reload supported

## Advanced Configuration

### Custom Ports

Modify port mapping in `docker compose.yml`:
```yaml
ports:
  - "8080:80"  # Map application to port 8080
```

### Environment Variables

Add environment variables in `docker compose.yml`:
```yaml
environment:
  - NODE_ENV=production
  - API_BASE_URL=https://api.example.com
```

### SSL/HTTPS Configuration

1. Place SSL certificates in the `ssl/` folder in project root
2. Modify `nginx.conf` to add SSL configuration:

```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    # ... other configurations
}
```

3. Update `docker compose.yml` to mount SSL certificates:

```yaml
volumes:
  - ./ssl:/etc/nginx/ssl:ro
ports:
  - "443:443"
```

### Reverse Proxy Configuration

To proxy backend APIs, uncomment the API proxy section in `nginx.conf`:

```nginx
location /api/ {
    proxy_pass http://backend:3000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Monitoring and Logging

### View Logs
```bash
# View application logs
docker compose logs -f viewanywhere

# View nginx access logs
docker exec viewanywhere-prod tail -f /var/log/nginx/access.log

# View nginx error logs
docker exec viewanywhere-prod tail -f /var/log/nginx/error.log
```

### Health Checks
```bash
# Check container health status
docker compose ps

# Manual health check
curl http://localhost/health
```

## Performance Optimization

### Nginx Optimization
- Gzip compression enabled
- Static resource caching configured
- Security headers set

### Docker Optimization
- Multi-stage build to reduce image size
- Alpine Linux base images used
- .dockerignore configured to exclude unnecessary files

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Check port usage
   lsof -i :80
   # Or use different port
   ```

2. **Build failures**
   ```bash
   # Clean Docker cache
   docker system prune -a
   # Rebuild
   docker compose build --no-cache
   ```

3. **Permission issues**
   ```bash
   # Ensure Docker has sufficient permissions
   sudo docker compose up -d
   ```

### Debug Mode

Enable verbose logging:
```bash
docker compose up --verbose
```

## Production Recommendations

1. **Security**
   - Use HTTPS
   - Regularly update base images
   - Configure firewall rules

2. **Monitoring**
   - Integrate log collection systems
   - Set up performance monitoring
   - Configure alerting mechanisms

3. **Backup**
   - Regularly backup configuration files
   - Backup user data (if any)

4. **Scaling**
   - Consider load balancing
   - Configure multi-instance deployment
   - Use container orchestration platforms (like Kubernetes)

## Docker Commands Reference

### Basic Operations
```bash
# Build images
docker compose build

# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# Scale services
docker compose up -d --scale viewanywhere=3
```

### Maintenance
```bash
# Update images
docker compose pull
docker compose up -d

# Clean up
docker system prune
docker volume prune
```

### Development
```bash
# Rebuild and restart
docker compose down
docker compose build
docker compose up -d

# Execute commands in container
docker compose exec viewanywhere sh
```