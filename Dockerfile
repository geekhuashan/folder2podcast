# 依赖安装阶段
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci

# 构建阶段
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 运行阶段
FROM node:20-alpine AS runner
WORKDIR /app

# 环境变量说明：
# - PORT: 服务器端口（默认3100）
# - BASE_URL: 服务器基础URL，不含端口号
# - DATABASE_URL: 数据库文件路径（可选，默认 ./data/podcasts.db）
# - ENABLE_REGISTRATION: 是否允许注册（可选，默认 true）
# - ADMIN_USERNAME: 管理员用户名（可选）
# - ADMIN_PASSWORD: 管理员密码（可选）
ENV NODE_ENV=production \
    PORT=3100 \
    HOSTNAME=0.0.0.0 \
    AUDIO_DIR=/podcasts \
    BASE_URL=http://localhost

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p /podcasts /app/data && \
    chown -R nextjs:nodejs /podcasts /app/data

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3100

CMD ["node", "server.js"]
