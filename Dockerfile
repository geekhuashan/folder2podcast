# ====================================
# 构建阶段
# ====================================
FROM node:20-alpine AS builder
WORKDIR /app

# 复制依赖文件
COPY package.json package-lock.json* ./

# 安装所有依赖(包括 devDependencies)
RUN npm ci && npm cache clean --force

# 复制源代码
COPY . .

# 构建应用
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# ====================================
# 运行阶段
# ====================================
FROM node:20-alpine AS runner
WORKDIR /app

# 安装运行时依赖工具
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

# 复制 package.json 和 package-lock.json 用于安装生产依赖
COPY --from=builder /app/package.json /app/package-lock.json ./

# 只安装生产依赖
RUN npm ci --omit=dev && npm cache clean --force

# 从构建阶段复制构建产物
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# 复制数据库相关文件
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts ./drizzle.config.ts

# 全局安装 tsx 用于运行数据库迁移
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
