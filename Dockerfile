# ====================================
# 依赖安装阶段
# ====================================
FROM node:20-slim AS deps

WORKDIR /app

# 安装编译依赖（用于编译 native 模块）
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci --ignore-scripts && \
    npm rebuild better-sqlite3

# ====================================
# 构建阶段
# ====================================
FROM node:20-slim AS builder

WORKDIR /app

# 从 deps 阶段复制 node_modules
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 生成 OpenAPI 文档并构建 Next.js
RUN npm run build

# ====================================
# 运行阶段
# ====================================
FROM node:20-slim

WORKDIR /app

# 安装运行时依赖（BBDown 需要的系统库和 FFmpeg）
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    ffmpeg \
    wget \
    && rm -rf /var/lib/apt/lists/*

# 创建非 root 用户
RUN groupadd -g 1000 nodejs && \
    useradd -u 1000 -g nodejs -s /bin/sh -m nodejs

# 复制构建产物
COPY --from=builder --chown=nodejs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nodejs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nodejs:nodejs /app/public ./public

# 复制 BBDown 二进制文件（如果存在）
# 注意: bin 目录中应该包含对应平台的 BBDown 可执行文件
# 命名格式: BBDown-linux-x64, BBDown-linux-arm64
COPY --chown=nodejs:nodejs bin/ ./bin/ 2>/dev/null || true
RUN chmod +x ./bin/BBDown-* 2>/dev/null || true

# 创建必要的目录
RUN mkdir -p /podcasts /app/data && \
    chown -R nodejs:nodejs /podcasts /app/data

# 设置环境变量
ENV NODE_ENV=production \
    PORT=3100 \
    AUDIO_DIR=/podcasts \
    BASE_URL=http://localhost:3100 \
    HOSTNAME=0.0.0.0

# 切换到非 root 用户
USER nodejs

# 暴露端口
EXPOSE 3100

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/api/health || exit 1

# 启动命令
CMD ["node", "server.js"]
