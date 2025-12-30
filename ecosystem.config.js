module.exports = {
  apps: [
    {
      name: 'folder2podcast',
      script: 'dist/index.js',
      // 统一从 .env 文件读取环境变量，避免重复维护
      env_file: '.env',
      // 这里只设置必须的运行时配置
      env: {
        NODE_ENV: 'production'  // 运行时强制为生产模式
      }
    }
  ]
};
