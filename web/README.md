# Web 管理界面部署说明

## 概述

Folder2Podcast Web 管理界面是一个基于 SolidJS 的单页应用，提供直观的播客管理功能。

## 目录结构

```
web/
├── src/
│   ├── components/          # SolidJS 组件
│   │   ├── PodcastList.jsx  # 播客列表
│   │   ├── FileManager.jsx  # 文件管理
│   │   ├── ConfigEditor.jsx # 配置编辑
│   │   └── AudioPlayer.jsx  # 音频播放器
│   ├── styles/
│   │   └── global.css       # 全局样式
│   ├── utils/
│   │   └── api.js           # API 工具函数
│   ├── App.jsx              # 主应用组件
│   └── index.jsx            # 入口文件
├── public/                  # 公共资源
├── index.html               # HTML 模板
├── vite.config.js           # Vite 配置
└── package.json             # 依赖配置
```

## 构建方式

### 开发环境

Web 界面构建后会输出到 `assets/web` 目录，由后端服务器直接提供。

**一体化部署流程**：

1. 安装依赖（如果还未安装）
```bash
cd web
npm install
```

2. 构建 Web 界面
```bash
npm run build
# 或在根目录运行
npm run build:web
```

3. 构建后端并启动
```bash
cd ..
npm run build
npm start
```

4. 访问管理界面
```
http://localhost:3100/web/index.html
```

### 生产环境

**完整构建**：
```bash
# 在项目根目录
npm run build:all
# 这会同时构建后端和前端
```

**Docker 部署**：
```dockerfile
# Dockerfile 已包含 Web 构建步骤
FROM node:18-alpine

WORKDIR /app

# 复制项目文件
COPY package*.json ./
COPY web/package*.json ./web/
RUN npm install && cd web && npm install

# 构建后端和前端
COPY . .
RUN npm run build:all

# 启动
CMD ["node", "dist/index.js"]
```

## 配置选项

### API Key 认证

如果服务器设置了 `API_KEY` 环境变量，访问管理界面时需要提供：

```
http://localhost:3100/web/index.html?apiKey=your-secret-key
```

API Key 会自动附加到所有管理 API 请求中。

### 开发模式代理

在开发Web界面时，Vite 已配置代理到后端服务器：

```javascript
// vite.config.js
server: {
  port: 3001,
  proxy: {
    '/api': 'http://localhost:3100',
    '/feeds': 'http://localhost:3100',
    '/audio': 'http://localhost:3100'
  }
}
```

启动开发服务器：
```bash
cd web
npm run dev
# 访问 http://localhost:3001
```

## 功能说明

### 1. 播客列表
- 显示所有播客及其基本信息
- 点击卡片进入播客管理界面

### 2. 文件管理
- **上传文件** - 支持音频文件和封面图片
- **删除文件** - 删除不需要的文件
- **重命名** - 修改文件名调整剧集顺序
- **在线试听** - 直接在浏览器中播放音频

### 3. 配置编辑
- 编辑播客元数据（标题、描述、作者、邮箱）
- 实时保存到 podcast.json 文件

## 响应式设计

Web 界面已适配移动设备：
- 小屏幕（< 768px）：单列布局，简化按钮
- 中大屏幕：网格布局，完整功能

## 浏览器兼容性

支持现代浏览器：
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- 移动端 Safari/Chrome

## 故障排查

### 问题：Web 界面无法加载

**解决方案**：
1. 确认 Web 界面已构建：`npm run build:web`
2. 检查 `assets/web/` 目录是否存在
3. 确认服务器正常运行

### 问题：API 请求失败（401 Unauthorized）

**解决方案**：
1. 检查是否设置了 `API_KEY` 环境变量
2. 在 URL 中添加 `?apiKey=your-key` 参数

### 问题：文件上传失败

**解决方案**：
1. 检查文件大小（限制 500MB）
2. 确认文件格式（音频/图片）
3. 查看浏览器控制台错误信息

### 问题：CORS 错误

**解决方案**：
1. 确认服务器已启用 CORS（已默认配置）
2. 检查请求 URL 是否正确

## 自定义开发

### 修改样式

编辑 `web/src/styles/global.css`：
```css
:root {
  --primary-color: #3b82f6;  /* 修改主色调 */
  /* 其他颜色变量... */
}
```

### 添加新功能

1. 在 `web/src/components/` 创建新组件
2. 在 `web/src/App.jsx` 中导入使用
3. 重新构建：`npm run build:web`

### API 扩展

如需添加新的 API 端点：

1. 在 `web/src/utils/api.js` 添加方法：
```javascript
export const podcastsAPI = {
  // 新方法
  async customAction(podcastDir, data) {
    return request(
      `${API_BASE}/manage/podcasts/${podcastDir}/custom`,
      { method: 'POST', body: JSON.stringify(data) }
    );
  }
};
```

2. 在组件中调用：
```javascript
import { podcastsAPI } from '../utils/api';

const handleCustomAction = async () => {
  await podcastsAPI.customAction(podcast.dirName, data);
};
```

## 性能优化

### 生产构建优化

Vite 已配置自动优化：
- 代码分割
- CSS 压缩
- Tree shaking
- Gzip 压缩建议

### 缓存策略

静态资源已包含哈希值，支持长期缓存：
```
main-CZrFyaKw.js   # 文件名包含内容哈希
```

## 安全注意事项

1. **API Key 保护** - 不要在公开场合暴露 API Key
2. **HTTPS** - 生产环境建议使用 HTTPS
3. **文件类型验证** - 后端已实现文件类型检查
4. **路径安全** - 后端已实现路径穿越防护

## 更新日志

### v1.0.0 (2025-12-19)
- ✅ 实现播客列表展示
- ✅ 实现文件管理（上传、删除、重命名）
- ✅ 实现音频在线试听
- ✅ 实现配置编辑
- ✅ 响应式设计支持移动端
- ✅ 一体化部署配置

## 技术栈

- **框架**: SolidJS 1.8.0
- **构建工具**: Vite 5.0.0
- **样式**: 原生 CSS (CSS Variables)
- **HTTP 客户端**: Fetch API

## 相关文档

- [Management API 文档](../MANAGEMENT_API.md)
- [项目 README](../../README.md)
- [SolidJS 官方文档](https://www.solidjs.com/)
- [Vite 官方文档](https://vitejs.dev/)
