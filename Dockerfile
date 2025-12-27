# ====================================
# 后端构建阶段
# ====================================
FROM node:20-alpine AS backend-builder

WORKDIR /app

# 复制后端 package 文件并安装依赖
COPY package*.json ./
RUN npm install

# 复制源代码
COPY src ./src
COPY tsconfig.json ./

# 构建后端
RUN npm run build

# ====================================
# 前端构建阶段
# ====================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/web

# 复制前端 package 文件并安装依赖
COPY web/package*.json ./
RUN npm install

# 复制前端源代码
COPY web ./

# 构建前端
RUN npm run build

# ====================================
# 运行阶段
# ====================================
FROM node:20-alpine

WORKDIR /app

# 安装运行时依赖（BBDown 需要的系统库和 FFmpeg）
RUN apk add --no-cache \
    ca-certificates \
    ffmpeg \
    wget

# 复制后端构建产物和依赖
COPY --from=backend-builder /app/dist ./dist
COPY --from=backend-builder /app/package*.json ./
COPY --from=backend-builder /app/node_modules ./node_modules

# 复制前端构建产物（Vite 构建输出到 ../assets/web）
COPY --from=frontend-builder /app/assets ./assets

# 创建必要的目录
RUN mkdir -p /podcasts /app/bin && chmod 755 /podcasts

# 复制 BBDown 二进制文件（如果存在）
# 注意: bin 目录中应该包含对应平台的 BBDown 可执行文件
# 命名格式: BBDown-linux-x64, BBDown-linux-arm64
COPY bin/ ./bin/
# 确保 BBDown 二进制文件有可执行权限
RUN chmod +x ./bin/BBDown-* 2>/dev/null || true

# 设置环境变量
ENV NODE_ENV=production \
    PORT=3100 \
    AUDIO_DIR=/podcasts \
    BASE_URL=http://localhost:3100 \
    PUID=1000 \
    PGID=1000

# 创建启动脚本
RUN printf '%s\n' \
    '#!/bin/sh' \
    'echo "Starting Folder2Podcast v2..."' \
    'echo "Audio directory: $AUDIO_DIR"' \
    'echo "Base URL: $BASE_URL"' \
    'echo "Port: $PORT"' \
    '' \
    '# 设置文件权限' \
    'chown -R $PUID:$PGID /app/dist /app/node_modules /app/web /podcasts 2>/dev/null || true' \
    'if [ -d /app/bin ]; then chown -R $PUID:$PGID /app/bin; fi' \
    '' \
    '# 启动应用' \
    'exec node dist/index.js' \
    > /entrypoint.sh && \
    chmod +x /entrypoint.sh

# 暴露端口
EXPOSE 3100

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/api/podcasts || exit 1

# 启动命令
CMD ["/entrypoint.sh"]