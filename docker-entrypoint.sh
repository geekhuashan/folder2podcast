#!/bin/sh
set -e

# 以 root 身份修复挂载目录的权限
# 如果目录不存在或权限不对，自动修复
if [ -d /app/data ]; then
    chown -R nextjs:nodejs /app/data 2>/dev/null || true
fi

if [ -d /app/audio ]; then
    chown -R nextjs:nodejs /app/audio 2>/dev/null || true
fi

# 切换到 nextjs 用户运行应用
exec su-exec nextjs:nodejs "$@"
