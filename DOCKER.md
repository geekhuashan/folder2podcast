# Folder2Podcast v2 Docker 部署指南

本文档介绍如何使用 Docker 部署 Folder2Podcast v2 版本。

## 版本说明

**重要提示**: v2 版本使用独立的镜像标签，不会影响 v1 用户：

- `folder2podcast:v2` - v2 版本主标签
- `folder2podcast:latest-v2` - v2 版本最新标签
- `folder2podcast:dev` - v1 开发版本（旧版本）

## 快速开始

### 方式一：使用 Docker Compose（推荐）

1. **克隆或下载项目**
```bash
git clone <your-repo-url>
cd folder2podcast
```

2. **修改 docker-compose.yml 配置**
```bash
# 编辑 docker-compose.yml，修改以下内容：
# 1. volumes: 将 ./audio 改为你的音频文件夹路径
# 2. BASE_URL: 改为你的实际访问地址
```

3. **启动服务**
```bash
# 方式 1: 使用 npm 脚本
npm run docker:compose:up

# 方式 2: 直接使用 docker-compose
docker-compose up -d
```

4. **访问应用**
```
http://localhost:3100
```

5. **查看日志**
```bash
npm run docker:compose:logs
# 或
docker-compose logs -f
```

### 方式二：使用 Docker 命令

1. **构建镜像**
```bash
npm run docker:build
# 或
docker build -t folder2podcast:v2 .
```

2. **运行容器**

**Mac/Linux 用户（推荐）**:
```bash
npm run docker:mac
```

**通用方式**:
```bash
npm run docker:test
```

**手动运行（完整配置）**:
```bash
docker run -d \
  --name folder2podcast-v2 \
  -p 3100:3100 \
  -v /path/to/your/audio:/podcasts \
  -e BASE_URL=http://localhost:3100 \
  -e PUID=$(id -u) \
  -e PGID=$(id -g) \
  folder2podcast:v2
```

## 环境变量配置

| 变量名 | 必需 | 默认值 | 说明 |
|--------|------|--------|------|
| `PORT` | 否 | 3100 | 服务监听端口 |
| `AUDIO_DIR` | 是 | /podcasts | 容器内音频文件路径（不建议修改） |
| `BASE_URL` | 是 | http://localhost:3100 | RSS feed 中的 URL 基础地址 |
| `PUID` | 否 | 1000 | 运行用户 ID（避免权限问题） |
| `PGID` | 否 | 1000 | 运行用户组 ID |

### BASE_URL 配置说明

`BASE_URL` 需要根据实际访问方式设置：

- **本地访问**: `http://localhost:3100`
- **局域网访问**: `http://192.168.x.x:3100`
- **域名访问**: `https://your-domain.com`
- **反向代理**: 代理后的完整 URL

**为什么重要**: RSS feed 中的音频链接使用 `BASE_URL` 生成，播客客户端需要通过这些链接下载音频。

## 卷挂载配置

### 音频文件目录

```yaml
volumes:
  - /path/to/your/audio:/podcasts
```

**注意事项**:
- 默认以只读模式挂载（`:ro`），保护原始文件
- 如需使用 B站视频下载功能，改为读写模式（去掉 `:ro`）

### BBDown 工具（可选）

如果需要 B站视频下载功能：

1. 下载 BBDown 二进制文件到 `bin/` 目录
2. 音频目录改为读写模式挂载
3. 详见项目主文档 `CLAUDE.md`

## Docker 命令参考

### 构建相关

```bash
# 构建镜像（基础）
npm run docker:build

# 构建镜像（包含前后端完整构建）
npm run docker:build:all

# Docker Compose 重新构建
npm run docker:compose:rebuild
```

### 运行相关

```bash
# 启动容器（Mac/Linux）
npm run docker:mac

# 启动容器（测试）
npm run docker:test

# Docker Compose 启动
npm run docker:compose:up

# Docker Compose 停止
npm run docker:compose:down
```

### 维护相关

```bash
# 停止并删除容器
npm run docker:stop

# 清理镜像和容器
npm run docker:clean

# 查看日志
npm run docker:compose:logs
docker logs -f folder2podcast-v2
```

## 常见问题

### 1. 权限问题

**症状**: 容器无法读取音频文件或写入下载的音频

**解决方案**:
```bash
# Mac/Linux: 使用当前用户的 UID 和 GID
docker run ... -e PUID=$(id -u) -e PGID=$(id -g) ...

# 或者修改音频文件夹权限
chmod -R 755 /path/to/audio
```

### 2. 端口冲突

**症状**: 启动失败，提示端口已被占用

**解决方案**:
```bash
# 方式 1: 修改宿主机端口映射
-p 3200:3100  # 将 3100 改为其他端口

# 方式 2: 停止占用端口的服务
lsof -i :3100
kill <PID>
```

### 3. RSS feed 链接无法访问

**症状**: 播客客户端无法下载音频文件

**解决方案**:
确保 `BASE_URL` 设置正确：
```bash
# 检查当前配置
docker exec folder2podcast-v2 env | grep BASE_URL

# 重新启动并设置正确的 BASE_URL
docker rm -f folder2podcast-v2
docker run ... -e BASE_URL=http://your-actual-ip:3100 ...
```

### 4. 健康检查失败

**症状**: 容器状态显示 unhealthy

**解决方案**:
```bash
# 检查日志
docker logs folder2podcast-v2

# 手动测试健康检查
docker exec folder2podcast-v2 wget -O- http://localhost:3100/api/v2/podcasts
```

### 5. B站下载功能不可用

**症状**: 提示 BBDown 不可用

**解决方案**:
1. 确保 `bin/` 目录包含对应平台的 BBDown 二进制
2. 确保音频目录以读写模式挂载（去掉 `:ro`）
3. 检查容器日志确认 BBDown 权限

## 进阶配置

### 使用反向代理（Nginx）

```nginx
server {
    listen 80;
    server_name podcast.example.com;

    location / {
        proxy_pass http://localhost:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

配置后记得更新 `BASE_URL`:
```bash
-e BASE_URL=https://podcast.example.com
```

### 使用 HTTPS

1. 配置 SSL 证书（Let's Encrypt 或其他）
2. 设置 `BASE_URL` 为 https 地址
3. 更新 Nginx 配置启用 SSL

### 持久化日志

```yaml
volumes:
  - ./audio:/podcasts
  - ./logs:/app/logs  # 挂载日志目录
```

## 升级指南

### 从 v1 升级到 v2

v2 使用独立的镜像标签，可以与 v1 并存：

```bash
# 1. 停止 v1 容器（如果在运行）
docker stop folder2podcast-mac
docker stop folder2podcast-test

# 2. 构建或拉取 v2 镜像
npm run docker:build

# 3. 启动 v2 容器（使用不同的端口避免冲突）
docker run -d \
  --name folder2podcast-v2 \
  -p 3100:3100 \
  -v /path/to/audio:/podcasts \
  -e BASE_URL=http://localhost:3100 \
  folder2podcast:v2

# 4. 测试 v2 功能正常后，可以删除 v1 容器
docker rm folder2podcast-mac folder2podcast-test
```

### 更新 v2 版本

```bash
# 停止并删除旧容器
npm run docker:stop

# 重新构建镜像
npm run docker:build:all

# 启动新容器
npm run docker:mac
```

## 性能优化

### 1. 限制日志大小

已在 `docker-compose.yml` 中配置：
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### 2. 资源限制

```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 1G
    reservations:
      memory: 512M
```

### 3. 缓存优化

v2 版本使用内存缓存 RSS feed（TTL 5 分钟），无需额外配置。

## 安全建议

1. **只读挂载**: 如不需要下载功能，使用 `:ro` 只读挂载音频目录
2. **最小权限**: 使用非 root 用户运行（PUID/PGID）
3. **网络隔离**: 考虑使用 Docker 网络隔离
4. **定期更新**: 及时更新镜像以获取安全补丁

## 技术支持

如遇到问题：

1. 查看容器日志: `docker logs folder2podcast-v2`
2. 检查健康状态: `docker ps | grep folder2podcast`
3. 访问 Web 界面: `http://localhost:3100`
4. 测试 API: `curl http://localhost:3100/api/v2/podcasts`

更多信息请参考项目主文档 `CLAUDE.md`。
