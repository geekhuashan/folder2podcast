# PM2 部署指南

## 快速开始（一键部署）

```bash
# 1. 安装 PM2
npm install -g pm2

# 2. 一键构建并启动
npm run pm2

# 3. 查看状态
pm2 list
```

就这么简单！`npm run pm2` 会自动完成构建和启动。

## 常用命令

```bash
npm run pm2           # 一键部署（构建 + 启动）
npm run pm2:stop      # 停止
npm run pm2:restart   # 重启（不重新构建）
npm run pm2:reload    # 重新构建 + 重启（更新代码后用）
npm run pm2:logs      # 查看日志
npm run pm2:delete    # 删除进程
```

## 更新代码后重启

```bash
# 拉取最新代码
git pull

# 重新构建并重启
npm run pm2:reload
```

## 修改配置

编辑 `ecosystem.config.js` 文件：

```javascript
module.exports = {
  apps: [{
    name: 'folder2podcast',
    script: 'dist/index.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3100,
      AUDIO_DIR: './audio',              // 修改为你的音频目录
      BASE_URL: 'http://localhost:3100', // 修改为你的域名
      ADMIN_USERNAME: 'admin',           // 管理员用户名
      ADMIN_PASSWORD: 'admin'            // ⚠️ 请修改默认密码！
    }
  }]
};
```

⚠️ **重要**：生产环境请务必修改 `ADMIN_PASSWORD`！

修改后执行：`npm run pm2:reload`

## 开机自启动

```bash
pm2 startup    # 生成启动脚本并执行
pm2 save       # 保存当前进程
```

完成！
