# ViewAnywhere 部署指南

本项目提供了完整的Docker化部署方案，支持生产环境和开发环境。

## 文件说明

- `Dockerfile.cn` - 中国网络环境下，生产环境多阶段构建配置
- `Dockerfile.dev` - 开发环境配置
- `docker compose-cn.yml` - 中国网络环境下，Docker Compose编排文件
- `nginx.conf` - Nginx服务器配置
- `.dockerignore` - Docker构建忽略文件

## 快速开始

### 生产环境部署

1. **构建并启动服务**
   ```bash
   docker compose -f docker compose-cn.yml up -d
   ```

2. **访问应用**
   - 应用地址: http://localhost
   - 健康检查: http://localhost/health

3. **停止服务**
   ```bash
   docker compose down
   ```

### 开发环境部署

1. **启动开发服务**
   ```bash
   docker compose --profile dev up -d viewanywhere-dev
   ```

2. **访问开发服务**
   - 开发地址: http://localhost:5173
   - 支持热重载

## 高级配置

### 自定义端口

修改 `docker compose-cn.yml` 中的端口映射：
```yaml
ports:
  - "8080:80"  # 将应用映射到8080端口
```

### 环境变量

在 `docker compose-cn.yml` 中添加环境变量：
```yaml
environment:
  - NODE_ENV=production
  - API_BASE_URL=https://api.example.com
```

### SSL/HTTPS配置

1. 将SSL证书放在项目根目录的 `ssl/` 文件夹中
2. 修改 `nginx.conf` 添加SSL配置：

```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    # ... 其他配置
}
```

3. 更新 `docker compose-cn.yml` 挂载SSL证书：

```yaml
volumes:
  - ./ssl:/etc/nginx/ssl:ro
ports:
  - "443:443"
```

### 反向代理配置

如果需要代理后端API，取消注释 `nginx.conf` 中的API代理部分：

```nginx
location /api/ {
    proxy_pass http://backend:3000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## 监控和日志

### 查看日志
```bash
# 查看应用日志
docker compose logs -f viewanywhere

# 查看nginx访问日志
docker exec viewanywhere-prod tail -f /var/log/nginx/access.log

# 查看nginx错误日志
docker exec viewanywhere-prod tail -f /var/log/nginx/error.log
```

### 健康检查
```bash
# 检查容器健康状态
docker compose ps

# 手动健康检查
curl http://localhost/health
```

## 性能优化

### Nginx优化
- 启用了Gzip压缩
- 配置了静态资源缓存
- 设置了安全头

### Docker优化
- 使用多阶段构建减小镜像大小
- 使用Alpine Linux基础镜像
- 配置了.dockerignore排除不必要文件

## 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   # 检查端口占用
   lsof -i :80
   # 或使用其他端口
   ```

2. **构建失败**
   ```bash
   # 清理Docker缓存
   docker system prune -a
   # 重新构建
   docker compose build --no-cache
   ```

3. **权限问题**
   ```bash
   # 确保Docker有足够权限
   sudo docker compose up -d
   ```

### 调试模式

启用详细日志：
```bash
docker compose up --verbose
```

## 生产环境建议

1. **安全性**
   - 使用HTTPS
   - 定期更新基础镜像
   - 配置防火墙规则

2. **监控**
   - 集成日志收集系统
   - 设置性能监控
   - 配置告警机制

3. **备份**
   - 定期备份配置文件
   - 备份用户数据（如果有）

4. **扩展**
   - 考虑使用负载均衡
   - 配置多实例部署
   - 使用容器编排平台（如Kubernetes）