# Logs 目录

用于存放应用程序运行日志。

## 开发环境

使用 npm script 启动时，日志输出到终端：
```bash
npm run dev:backend
```

## 生产环境

如果需要将日志输出到文件，可以使用：
```bash
npm start > logs/server.log 2>&1 &
```

或使用 PM2 进程管理器（推荐）：
```bash
pm2 start dist/index.js --name folder2podcast
pm2 logs folder2podcast
```
