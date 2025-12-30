module.exports = {
  apps: [
    {
      name: 'folder2podcast',
      script: 'dist/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3100,
        AUDIO_DIR: './audio',
        BASE_URL: 'http://localhost:3100',
        ADMIN_USERNAME: 'admin',
        ADMIN_PASSWORD: 'admin'
      }
    }
  ]
};
