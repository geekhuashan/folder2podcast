# ====================================
# 依赖安装阶段
# ====================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 复制依赖文件
COPY package.json package-lock.json* ./
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# ====================================
# 构建阶段
# ====================================
FROM node:20-alpine AS builder
WORKDIR /app

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 设置生产环境并构建
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# 安装所有依赖(包括 devDependencies)用于构建
RUN npm install && \
    npm run build

# ====================================
# 运行阶段
# ====================================
FROM node:20-alpine AS runner
WORKDIR /app

# 安装运行时依赖
RUN apk add --no-cache \
    tini \
    curl && \
    rm -rf /var/cache/apk/*

# 设置环境变量
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3100 \
    HOSTNAME=0.0.0.0

# 创建用户和目录
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p /app/data /app/audio /app/podcasts && \
    chown -R nextjs:nodejs /app

# 从构建阶段复制文件
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# 复制数据库相关文件
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts ./drizzle.config.ts

# 从依赖阶段复制生产依赖
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# 安装 tsx (用于运行数据库迁移)
RUN npm install -g tsx

# 切换到非 root 用户
USER nextjs

# 暴露端口
EXPOSE 3100

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3100/api/health || exit 1

# 使用 tini 作为 init 系统
ENTRYPOINT ["/sbin/tini", "--"]

# 启动命令:先运行数据库迁移,再启动服务
CMD ["sh", "-c", "tsx lib/db/migrate.ts && node server.js"]
