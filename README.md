[![SVG Banners](https://svg-banners.vercel.app/api?type=rainbow&text1=Folder2Podcast&text2=RSS&width=800&height=400)](https://github.com/Akshay090/svg-banners)

# 🎙️ Folder2Podcast RSS

> 一键将本地音频文件夹转换为私人播客 RSS 订阅源，支持多平台视频下载、云存储集成、智能元数据管理

[English Version](README.en.md)

## 目录

- [✨ 核心特性](#-核心特性)
- [🏗️ 架构设计](#️-架构设计)
- [🚀 快速开始](#-快速开始)
  - [Docker 一键部署（推荐）](#docker-一键部署推荐)
  - [本地开发](#本地开发)
- [⚙️ 配置说明](#️-配置说明)
  - [环境变量](#环境变量)
  - [播客配置](#播客配置)
- [🎨 核心功能](#-核心功能)
  - [多平台视频下载](#多平台视频下载)
  - [存储架构](#存储架构)
  - [剧集元数据管理](#剧集元数据管理)
  - [Web 管理界面](#web-管理界面)
- [📦 目录结构](#-目录结构)
- [🔒 认证与安全](#-认证与安全)
- [📱 客户端支持](#-客户端支持)
- [📋 API 文档](#-api-文档)
- [❓ 常见问题](#-常见问题)

## ✨ 核心特性

### 🎯 数据库驱动架构
- 💾 **SQLite 持久化** - 所有播客和剧集元数据存储在数据库中
- ⚡ **实时更新** - 文件操作时直接更新数据库，RSS Feed 始终获取最新数据
- 🔄 **统一数据源** - Web API 和 RSS Feed 使用相同数据生成服务，确保 100% 一致
- 👥 **多用户隔离** - 每个用户的播客在文件系统和数据库中完全隔离

### 🎥 智能视频下载
- 📺 **多平台支持** - 支持从 B站、抖音、YouTube、西瓜视频等平台下载视频
- 🔗 **智能识别** - 自动识别视频链接类型并选择合适的下载适配器
- 🎵 **音频提取** - 自动提取视频音频并添加到指定播客
- 📋 **任务队列** - 前端任务队列管理，支持批量下载和进度监控

### 💾 灵活存储架构
- 🗄️ **本地存储** - 默认使用本地文件系统存储音频文件
- ☁️ **S3 对象存储** - 支持 AWS S3、七牛云、阿里云 OSS 等兼容存储
- 🔀 **统一抽象** - 存储层统一接口，轻松扩展其他存储后端
- 🔐 **预签名 URL** - S3 存储自动生成预签名访问链接

### 🎨 强大的元数据管理
- 📝 **剧集级配置** - 为每个剧集单独设置标题、描述、发布时间、封面
- 🖼️ **封面管理** - 支持播客封面和剧集封面，智能回退机制
- 📅 **自定义排序** - 通过 `sortOrder` 精确控制剧集顺序
- 🔄 **重新发布** - 版本号机制支持剧集重新发布，改变播客客户端的 GUID

### 🌐 现代 Web 界面
- 📱 **响应式设计** - 支持桌面和移动设备
- 🎛️ **完整管理** - 播客管理、文件管理、元数据编辑、视频下载
- 🎵 **音频预览** - 内置音频播放器，直接预览音频文件
- 📊 **实时监控** - 任务队列状态、下载进度实时显示

## 🏗️ 架构设计

### 技术栈
- **后端**: Node.js + TypeScript + Fastify
- **数据库**: SQLite + Drizzle ORM
- **前端**: React + SolidJS + Tailwind CSS
- **存储**: 本地文件系统 / S3 对象存储
- **下载**: BBDown (B站) / yt-dlp (YouTube) 等

### 核心架构

```
┌──────────────────────────────────────────────────────┐
│                  Web 管理界面                          │
│  (React + SolidJS)                                    │
└───────────────────┬──────────────────────────────────┘
                    │ RESTful API
                    ↓
┌──────────────────────────────────────────────────────┐
│                  Fastify 服务器                        │
│  ┌────────────────────────────────────────────────┐  │
│  │  认证中间件 (Basic Auth / 管理员凭证)           │  │
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │  路由层                                         │  │
│  │  - 播客 CRUD (podcasts.routes.ts)              │  │
│  │  - 剧集元数据 (episodes.routes.ts)             │  │
│  │  - 文件管理 (file-management.routes.ts)        │  │
│  │  - 视频下载 (bilibili.routes.ts)               │  │
│  │  - RSS Feed (feed.routes.ts)                  │  │
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │  服务层                                         │  │
│  │  - 播客服务 (podcast.ts)                       │  │
│  │  - 文件管理 (file-management.service.ts)       │  │
│  │  - 视频下载 (bilibili-download.service.ts)     │  │
│  │  - 统一数据源 (feed-data.service.ts) ⭐         │  │
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │  适配器层                                        │  │
│  │  - B站适配器 (BilibiliAdapter)                 │  │
│  │  - 抖音适配器 (DouyinAdapter) - 预留            │  │
│  │  - YouTube 适配器 (YoutubeAdapter) - 预留       │  │
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │  存储抽象层                                      │  │
│  │  - 本地存储 (LocalStorage)                     │  │
│  │  - S3 存储 (S3Storage)                         │  │
│  └────────────────────────────────────────────────┘  │
└───────────────────┬──────────────────────────────────┘
                    │
                    ↓
┌──────────────────────────────────────────────────────┐
│              SQLite 数据库                             │
│  - podcasts (播客表)                                  │
│  - episodes (剧集表)                                  │
└──────────────────────────────────────────────────────┘
```

### 数据流

**文件上传/删除流程**:
```
用户操作 → Web API → 数据库更新 → 文件系统/S3 → 返回成功
                      ↓
                 实时反映到 RSS Feed
```

**RSS Feed 生成流程**:
```
客户端请求 → Feed 路由 → 统一数据源服务 → 数据库查询 → RSS XML 生成
                                                    ↓
                                              检测封面、填充 URL
```

**视频下载流程**:
```
用户提交 URL → 适配器工厂 → 平台识别 → 下载适配器 → 音频提取 → 添加到播客
                     ↓
              任务队列管理（前端）
```

## 🚀 快速开始

### Docker 一键部署（推荐）

**1. 准备工作**

- 安装 Docker
- 准备音频文件目录（按播客内容分文件夹）
- 规范文件命名（如：01-第一章.mp3、第02集.mp3）

**⚠️ 重要：BASE_URL 配置**

在部署到服务器时，必须正确配置 BASE_URL 环境变量，这直接影响到：
- RSS feed 中的音频文件链接
- 封面图片链接
- 所有静态资源的访问路径

正确配置示例：
```bash
# 本地测试时
BASE_URL=http://localhost:3100

# 部署到服务器时（请替换为实际的服务器IP或域名）
BASE_URL=http://192.168.55.222:3100
# 或者
BASE_URL=http://your-domain.com
```

注意事项：
- BASE_URL 必须包含协议前缀（http:// 或 https://）
- 如果使用了自定义端口，必须包含端口号
- 结尾不要添加斜杠 '/'
- 确保该地址可以从客户端（如播客APP）访问到

**2. 启动服务**

方式一：Docker 命令直接运行
```bash
docker run -d \
  --name folder2podcast \
  -p 3100:3100 \
  -v /path/to/audiobooks:/app/audio \
  -e PORT=3100 \
  -e BASE_URL=http://your-server-ip:3100 \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=your-password \
  yaotutu/folder2podcast:latest
```

方式二：使用 Docker Compose（推荐）
```yaml
# docker-compose.yml
version: '3.8'
services:
  folder2podcast:
    image: yaotutu/folder2podcast:latest
    container_name: folder2podcast
    ports:
      - "3100:3100"
    volumes:
      - ./audiobooks:/app/audio
      - ./data:/app/data  # 持久化数据库
    environment:
      - PORT=3100
      - BASE_URL=http://your-server-ip:3100
      - ADMIN_USERNAME=admin
      - ADMIN_PASSWORD=your-password
      # 可选：配置 S3 存储
      # - STORAGE_MODE=s3
      # - S3_ENDPOINT=https://s3.amazonaws.com
      # - S3_REGION=us-east-1
      # - S3_BUCKET=your-bucket
      # - S3_ACCESS_KEY_ID=your-access-key
      # - S3_SECRET_ACCESS_KEY=your-secret-key
      # - S3_PUBLIC_URL=https://your-bucket.s3.amazonaws.com
    restart: unless-stopped
```

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

**3. 访问管理界面**

打开浏览器访问：`http://localhost:3100`

首次访问会要求登录（如果配置了管理员凭证）。

**4. 订阅播客**

在播客客户端中添加 RSS 订阅源：
```
http://your-server-ip:3100/feeds/{userId}:{podcastName}.xml
```

### 本地开发

**1. 克隆项目**
```bash
git clone https://github.com/yaotutu/folder2podcast.git
cd folder2podcast
```

**2. 安装依赖**
```bash
# 安装后端依赖
npm install

# 安装前端依赖
cd web
npm install
cd ..
```

**3. 配置环境变量**

```bash
# 复制示例配置文件
cp .env.example .env

# 编辑 .env 文件
nano .env
```

**4. 初始化数据库**
```bash
# 数据库会在首次启动时自动创建
```

**5. 启动开发服务器**
```bash
# 同时启动前后端（热重载）
npm run dev

# 或者分别启动
npm run dev:backend  # 后端：http://localhost:3100
npm run dev:frontend # 前端：http://localhost:5173
```

**6. 构建生产版本**
```bash
# 构建前后端
npm run build:all

# 启动生产服务器
npm start
```

## ⚙️ 配置说明

### 环境变量

**配置优先级**（从高到低）：
1. 系统环境变量
2. `.env.local` (本地配置，不提交到 Git)
3. `.env` (通用配置，不提交到 Git)
4. `.env.development` 或 `.env.production` (环境特定配置)

**可用环境变量**：

| 环境变量              | 说明                       | 默认值                    | 示例                         |
| --------------------- | -------------------------- | ------------------------- | ---------------------------- |
| `AUDIO_DIR`           | 音频文件根目录路径         | `./audio`                 | `/path/to/audiobooks`        |
| `PORT`                | 服务器监听端口             | `3100`                    | `8080`                       |
| `BASE_URL`            | 服务器基础URL              | `http://localhost:端口号` | `http://192.168.55.222:3100` |
| `HOST`                | 主机名/IP地址              | `localhost`               | `0.0.0.0`                    |
| `ADMIN_USERNAME`      | 管理员用户名（可选）       | 无                        | `admin`                      |
| `ADMIN_PASSWORD`      | 管理员密码（可选）         | 无                        | `your-password`              |
| `NODE_ENV`            | 运行环境                   | `development`             | `production`                 |
| `STORAGE_MODE`        | 存储模式                   | `local`                   | `s3`                         |
| `S3_ENDPOINT`         | S3 端点                    | 无                        | `https://s3.amazonaws.com`   |
| `S3_REGION`           | S3 区域                    | 无                        | `us-east-1`                  |
| `S3_BUCKET`           | S3 存储桶名称              | 无                        | `your-bucket-name`           |
| `S3_ACCESS_KEY_ID`    | S3 访问密钥 ID             | 无                        | `your-access-key`            |
| `S3_SECRET_ACCESS_KEY`| S3 密钥                    | 无                        | `your-secret-key`            |
| `S3_PUBLIC_URL`       | S3 公开访问 URL            | 无                        | `https://your-bucket.s3...`  |
| `S3_BUCKET_PREFIX`    | S3 路径前缀（可选）        | 无                        | `folder2podcast`             |

**认证说明**：

系统支持两种认证方式：

1. **管理员凭证（推荐）**
   - 设置 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD`
   - 使用 HTTP Basic Auth 认证
   - 适用于生产环境

2. **无认证模式**
   - 不设置管理员凭证
   - 所有操作无需认证
   - 仅适用于受信任的内网环境

### 播客配置

播客配置通过 Web 界面管理，存储在数据库中。主要配置项：

**播客元数据**：
- `title` - 播客标题
- `description` - 播客描述
- `author` - 作者名称
- `email` - 联系邮箱
- `language` - 语言代码（默认：zh-cn）
- `category` - 分类（默认：Technology）
- `explicit` - 是否显式内容

**解析配置**：
- `titleFormat` - 标题格式化策略（clean/raw）
  - `clean` - 清理文件名，移除序号和扩展名
  - `raw` - 使用原始文件名

- `episodeNumberStrategy` - 剧集序号提取策略
  - `prefix` - 匹配文件名开头的数字（如 `01-xxx.mp3`）
  - `suffix` - 匹配扩展名前的数字（如 `xxx-01.mp3`）
  - `first` - 从左到右找第一个数字
  - `last` - 从右到左找最后一个数字
  - 自定义正则 - `{ "pattern": "正则表达式" }`

- `useMTime` - 是否使用文件修改时间作为发布时间
  - `false`（默认）- 根据 `sortOrder` 和 `basePubDate` 生成发布时间
  - `true` - 使用文件的修改时间

**排序配置**：
- `basePubDate` - 基准发布时间（可选）
  - 如果设置，pubDate = basePubDate + (sortOrder - 1) * 24小时
  - 如果不设置，使用最小的 sortOrder 剧集的创建时间

## 🎨 核心功能

### 多平台视频下载

**支持的平台**：
- ✅ B站（Bilibili）- 使用 BBDown
- 🚧 抖音（Douyin）- 预留接口
- 🚧 YouTube - 预留接口
- 🚧 西瓜视频 - 预留接口

**使用方式**：

1. **通过 Web 界面**：
   - 点击"下载视频"按钮
   - 粘贴视频链接
   - 选择目标播客
   - 点击"开始下载"
   - 实时查看下载进度

2. **通过 API**：
```bash
curl -X POST http://localhost:3100/api/download \
  -u "admin:password" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.bilibili.com/video/BV1qt4y1X7TW",
    "podcastId": "admin:my-podcast",
    "episodeTitle": "第一集",
    "autoCreatePodcast": true
  }'
```

**适配器架构**：

系统使用适配器模式管理多平台下载：
- `DownloadAdapterFactory` - 适配器工厂，根据 URL 自动选择适配器
- `IDownloadAdapter` - 统一的下载接口
- `BilibiliAdapter` - B站下载适配器实现
- 可扩展添加其他平台适配器

### 存储架构

**本地存储模式**（默认）：

```
audio/
├── {userId}/              # 用户隔离目录
│   ├── {podcastName}/     # 播客目录
│   │   ├── episode001.mp3 # 音频文件
│   │   ├── episode001.jpg # 剧集封面（与音频同名）
│   │   └── cover.jpg      # 播客封面
```

**S3 存储模式**：

```
s3://{bucket}/{prefix}/
├── {userId}/
│   ├── {podcastName}/
│   │   ├── episode001.mp3
│   │   ├── episode001.jpg
│   │   └── cover.jpg
```

**存储配置**：

环境变量配置示例：
```bash
# 本地存储（默认）
STORAGE_MODE=local
AUDIO_DIR=/path/to/audio

# S3 存储
STORAGE_MODE=s3
S3_ENDPOINT=https://s3-cn-east-1.qiniucs.com
S3_REGION=cn-east-1
S3_BUCKET=my-podcast-bucket
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_PUBLIC_URL=https://my-podcast-bucket.s3-cn-east-1.qiniucs.com
S3_BUCKET_PREFIX=folder2podcast
```

**统一接口**：

存储层提供统一接口，上层代码无需关心存储方式：
- `listFiles()` - 列出文件
- `fileExists()` - 检查文件是否存在
- `deleteFile()` - 删除文件
- `renameFile()` - 重命名文件
- `getFileUrl()` - 获取文件访问 URL
- `uploadFile()` - 上传文件

### 剧集元数据管理

**数据库设计**：

```sql
CREATE TABLE episodes (
  id TEXT PRIMARY KEY,              -- 格式: {podcastId}:{fileName}
  podcastId TEXT NOT NULL,          -- 所属播客
  fileName TEXT NOT NULL,           -- 文件名

  -- 用户自定义元数据
  title TEXT,                       -- 自定义标题
  description TEXT,                 -- 自定义描述
  pubDate INTEGER,                  -- 自定义发布时间
  coverUrl TEXT,                    -- 剧集封面路径

  -- 重新发布机制
  version INTEGER DEFAULT 1,        -- 版本号（改变 GUID）

  -- 排序机制
  sortOrder INTEGER,                -- 排序序号（越小越新）

  -- 文件信息
  duration INTEGER,                 -- 音频时长（秒）
  fileSize INTEGER,                 -- 文件大小（字节）

  -- 时间戳
  createdAt INTEGER DEFAULT (unixepoch()),
  updatedAt INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (podcastId) REFERENCES podcasts(id) ON DELETE CASCADE
);
```

**管理方式**：

1. **通过 Web 界面**：
   - 在文件管理中找到剧集
   - 点击"编辑元数据"按钮
   - 设置标题、描述、发布时间、封面
   - 保存后自动更新数据库和 RSS Feed

2. **通过 API**：
```bash
# 更新元数据
curl -X PUT http://localhost:3100/api/episodes/metadata \
  -u "admin:password" \
  -H "Content-Type: application/json" \
  -d '{
    "podcastId": "admin:my-podcast",
    "fileName": "episode001.mp3",
    "metadata": {
      "title": "第一集：开篇序章",
      "description": "故事的开始...",
      "pubDate": "2024-12-01T08:00:00Z",
      "coverUrl": "episode001.jpg"
    }
  }'

# 上传剧集封面
curl -X POST http://localhost:3100/api/episodes/episode001.mp3/cover \
  -u "admin:password" \
  -F "file=@cover.jpg"
```

**封面规则**：

- 剧集封面文件名：`{音频文件名（不含扩展名）}.{图片格式}`
- 支持格式：JPG、JPEG、PNG
- 封面 URL 优先级：剧集封面 > 播客封面
- 智能回退：如果播客没有封面，使用最新有封面的剧集封面

### Web 管理界面

**功能模块**：

1. **播客管理**
   - 查看所有播客列表
   - 创建新播客
   - 编辑播客元数据和配置
   - 删除播客
   - 复制 RSS 订阅链接

2. **文件管理**
   - 浏览播客目录下的所有文件
   - 上传音频文件和图片
   - 重命名文件
   - 删除文件
   - 音频播放器预览

3. **剧集元数据**
   - 为每个剧集编辑标题、描述、发布时间
   - 上传和管理剧集封面
   - 查看剧集详细信息（时长、文件大小等）
   - 拖拽排序（sortOrder）
   - 重新发布功能（version++）

4. **视频下载**
   - 支持多平台视频下载
   - 任务队列管理
   - 实时下载进度显示
   - 失败任务重试
   - 下载历史记录

5. **客户端订阅**
   支持多个主流播客客户端的一键订阅：
   - Apple Podcasts
   - Overcast
   - Pocket Casts
   - Castro
   - Moon FM

## 📦 目录结构

**项目结构**：

```
folder2podcast/
├── src/                          # 后端源代码
│   ├── index.ts                  # 应用入口
│   ├── server.ts                 # HTTP 服务器
│   ├── db/                       # 数据库
│   │   ├── index.ts              # 数据库连接
│   │   └── schema.ts             # 数据库表定义
│   ├── middleware/               # 中间件
│   │   ├── auth.middleware.ts    # 身份认证
│   │   └── error.middleware.ts   # 错误处理
│   ├── routes/                   # 路由层
│   │   ├── auth.routes.ts        # 认证路由
│   │   ├── podcasts.routes.ts    # 播客路由
│   │   ├── episodes.routes.ts    # 剧集路由
│   │   ├── feed.routes.ts        # RSS Feed 路由
│   │   ├── file-management.routes.ts  # 文件管理路由
│   │   ├── bilibili.routes.ts    # B站下载路由
│   │   └── audio.routes.ts       # 音频访问路由
│   ├── services/                 # 服务层
│   │   ├── podcast.ts            # 播客服务
│   │   ├── feed-data.service.ts  # 统一数据源服务 ⭐
│   │   ├── file-management.service.ts  # 文件管理服务
│   │   ├── bilibili-download.service.ts # B站下载服务
│   │   ├── storage/              # 存储服务
│   │   │   ├── index.ts          # 存储工厂
│   │   │   ├── storage.interface.ts  # 存储接口
│   │   │   ├── local.storage.ts  # 本地存储实现
│   │   │   └── s3.storage.ts     # S3 存储实现
│   │   └── download/             # 下载服务
│   │       └── ...
│   ├── adapters/                 # 适配器层
│   │   ├── adapter-factory.ts    # 适配器工厂
│   │   ├── base/                 # 基础适配器
│   │   └── bilibili/             # B站适配器
│   ├── utils/                    # 工具模块
│   │   ├── env.ts                # 环境变量
│   │   ├── url.ts                # URL 生成
│   │   ├── feed.ts               # RSS Feed 生成
│   │   ├── episode.ts            # 剧集解析
│   │   ├── sortOrder.ts          # 排序逻辑
│   │   ├── file.utils.ts         # 文件工具
│   │   ├── auth.ts               # 认证工具
│   │   └── watcher.ts            # 文件监听
│   └── types/                    # TypeScript 类型
│       └── index.ts
├── web/                          # 前端源代码
│   ├── src/
│   │   ├── components/           # React 组件
│   │   │   ├── Login.jsx         # 登录组件
│   │   │   ├── PodcastList.jsx   # 播客列表
│   │   │   ├── FileManager.jsx   # 文件管理
│   │   │   ├── EpisodeEditorModal.jsx  # 剧集编辑器
│   │   │   ├── ConfigEditor.jsx  # 配置编辑器
│   │   │   ├── DownloadVideoModal.jsx  # 视频下载
│   │   │   └── ...
│   │   ├── utils/
│   │   │   ├── api.js            # API 封装
│   │   │   ├── url.js            # URL 工具
│   │   │   └── ...
│   │   └── ...
│   └── ...
├── data/                         # 数据目录
│   └── database.sqlite           # SQLite 数据库（自动生成）
├── audio/                        # 音频文件目录（本地模式）
│   └── {userId}/
│       └── {podcastName}/
├── bin/                          # 二进制工具
│   └── BBDown-*                  # BBDown 下载器
├── assets/                       # 静态资源
│   └── web/                      # 构建后的前端
├── docs/                         # 文档
├── .env.example                  # 环境变量示例
├── docker-compose.yml            # Docker Compose 配置
├── Dockerfile                    # Docker 镜像配置
├── package.json
├── tsconfig.json
└── README.md
```

## 🔒 认证与安全

### 认证机制

**管理员凭证认证**（推荐）：

```bash
# 设置环境变量
export ADMIN_USERNAME="admin"
export ADMIN_PASSWORD="strong-password"

# 使用 curl 访问需要认证的接口
curl -u "admin:strong-password" \
  -X POST http://localhost:3100/api/podcasts \
  -H "Content-Type: application/json" \
  -d '{"title": "我的播客"}'
```

**API 认证说明**：

- **读操作**（公开访问）：
  - `GET /api/podcasts` - 获取播客列表
  - `GET /api/podcasts/:id` - 获取播客详情
  - `GET /feeds/:id.xml` - 获取 RSS Feed
  - `GET /audio/*` - 访问音频文件

- **写操作**（需要认证）：
  - `POST /api/podcasts` - 创建播客
  - `PUT /api/podcasts/:id` - 更新播客
  - `DELETE /api/podcasts/:id` - 删除播客
  - `POST /api/files` - 上传文件
  - `DELETE /api/files/:file` - 删除文件
  - 所有元数据编辑操作

### 安全建议

1. **生产环境**：
   - 设置强密码
   - 使用 HTTPS
   - 限制 ADMIN_USERNAME 和 ADMIN_PASSWORD 的访问权限
   - 定期更新依赖包

2. **Docker 部署**：
   - 不要在 Dockerfile 中硬编码密码
   - 使用 Docker Secrets 或环境变量传递敏感信息
   - 限制容器资源（CPU、内存）

3. **网络安全**：
   - 使用反向代理（Nginx）添加 HTTPS
   - 配置防火墙规则
   - 限制管理后台的访问 IP

## 📱 客户端支持

系统生成标准 RSS 2.0 + iTunes 扩展格式的 Feed，支持所有主流播客客户端：

### iOS / macOS
- ✅ Apple Podcasts
- ✅ Overcast
- ✅ Castro
- ✅ Pocket Casts
- ✅ Moon FM

### Android
- ✅ Pocket Casts
- ✅ AntennaPod
- ✅ Podcast Addict
- ✅ Player FM

### 桌面端
- ✅ iTunes (Windows)
- ✅ Vocal (macOS/Linux)

### 订阅方式

**方法一：复制链接粘贴**
1. 在 Web 界面点击"复制订阅链接"
2. 在播客客户端中添加订阅
3. 粘贴链接

**方法二：一键订阅（部分客户端）**
1. 在 Web 界面点击客户端图标（如 Apple Podcasts）
2. 自动跳转到客户端并添加订阅

**RSS Feed URL 格式**：
```
http://your-server:3100/feeds/{userId}:{podcastName}.xml
```

示例：
```
http://192.168.1.100:3100/feeds/admin:my-podcast.xml
```

## 📋 API 文档

### RESTful API

**播客管理**：
```bash
# 获取播客列表
GET /api/podcasts
GET /api/podcasts?username={username}

# 获取播客详情
GET /api/podcasts/:id

# 创建播客
POST /api/podcasts
Body: { "dirName": "my-podcast", "title": "我的播客", ... }

# 更新播客
PUT /api/podcasts/:id
Body: { "title": "新标题", ... }

# 删除播客
DELETE /api/podcasts/:id

# 扫描播客文件
POST /api/podcasts/:id/scan
```

**剧集管理**：
```bash
# 获取剧集列表
GET /api/episodes?podcastId={podcastId}

# 更新剧集元数据
PUT /api/episodes/metadata
Body: {
  "podcastId": "admin:my-podcast",
  "fileName": "episode001.mp3",
  "metadata": { "title": "新标题", "description": "..." }
}

# 删除剧集元数据
DELETE /api/episodes/:podcastId/:fileName/metadata

# 上传剧集封面
POST /api/episodes/:podcastId/:fileName/cover
Form: file=<图片文件>

# 删除剧集封面
DELETE /api/episodes/:podcastId/:fileName/cover

# 重新发布剧集（改变 GUID）
POST /api/episodes/:podcastId/:fileName/republish
```

**文件管理**：
```bash
# 列出文件
GET /api/files/:podcastId

# 上传文件
POST /api/files/:podcastId
Form: file=<文件>

# 删除文件
DELETE /api/files/:podcastId/:fileName

# 重命名文件
PATCH /api/files/:podcastId/:fileName
Body: { "newFileName": "new-name.mp3" }
```

**视频下载**：
```bash
# 下载视频
POST /api/download
Body: {
  "url": "https://www.bilibili.com/video/BV1xxx",
  "podcastId": "admin:my-podcast",
  "episodeTitle": "第一集",
  "autoCreatePodcast": true
}

# 获取平台列表
GET /api/download/platforms

# 检查平台可用性
GET /api/download/platforms/:platform/availability
```

**RSS Feed**：
```bash
# 获取 RSS Feed
GET /feeds/:id.xml
```

详细 API 文档请参考：[API 文档](docs/API.md)

## ❓ 常见问题

### Q1: 为什么 RSS Feed 没有更新？
**A**: 系统采用数据库实时更新架构，通常不需要手动刷新。如果遇到问题：
1. 检查文件是否正确上传到服务器
2. 刷新浏览器缓存（Ctrl+F5）
3. 检查数据库中的记录是否已更新
4. 重启服务

### Q2: 如何更改剧集顺序？
**A**: 有两种方式：
1. 通过 Web 界面拖拽剧集进行排序（自动更新 sortOrder）
2. 通过 API 直接修改 `sortOrder` 字段（值越小越新）

### Q3: 如何让播客客户端重新下载剧集？
**A**: 使用"重新发布"功能：
1. 在剧集管理中找到要重新发布的剧集
2. 点击"重新发布"按钮（version++）
3. 这会改变剧集的 GUID，播客客户端会将其视为新剧集

### Q4: S3 存储模式下文件访问很慢？
**A**: 检查以下配置：
1. `S3_PUBLIC_URL` 是否正确（应该使用 CDN 加速的 URL）
2. 网络连接是否稳定
3. S3 区域是否选择正确（选择就近区域）

### Q5: 支持哪些音频格式？
**A**: 支持常见的音频格式，包括：
- MP3（推荐）
- M4A
- M4B
- WAV
- FLAC
- AAC

### Q6: 如何备份数据？
**A**:
1. **数据库备份**：
```bash
# 备份数据库
cp data/database.sqlite data/database.sqlite.backup

# 或使用 SQLite 命令
sqlite3 data/database.sqlite ".backup data/backup.sql"
```

2. **文件备份**：
```bash
# 打包音频文件
tar -czf audio-backup.tar.gz audio/

# 或使用 rsync 同步到其他位置
rsync -av audio/ /backup/location/
```

3. **Docker 环境**：
```bash
# 备份数据卷
docker run --rm --volumes-from folder2podcast \
  -v $(pwd)/backup:/backup \
  alpine tar czf /backup/data-backup.tar.gz /app/data /app/audio
```

### Q7: 如何迁移到新服务器？
**A**:
1. 导出数据库：`sqlite3 data/database.sqlite ".dump" > backup.sql`
2. 打包音频文件：`tar -czf audio.tar.gz audio/`
3. 在新服务器上解压并导入
4. 更新环境变量（BASE_URL、存储配置等）

### Q8: 文件监听器的作用是什么？
**A**: 文件监听器主要用于：
- 调试和日志记录
- 检测文件系统变化
- S3 模式下自动禁用

**注意**：文件监听器不会自动更新数据库。文件操作（上传、删除、重命名）通过 Web API 进行时，会实时更新数据库。

### Q9: 如何添加新的视频平台支持？
**A**: 系统使用适配器模式，可以轻松扩展：
1. 在 `src/adapters/` 下创建新的适配器类
2. 实现 `IDownloadAdapter` 接口
3. 在 `DownloadAdapterFactory` 中注册新适配器
4. 添加对应的下载工具（如 yt-dlp）

详细开发指南请参考：[开发文档](docs/DEVELOPMENT.md)

### Q10: 生产环境部署建议？
**A**:
1. **使用 Docker Compose**，配置健康检查和自动重启
2. **配置反向代理**（Nginx）添加 HTTPS 和缓存
3. **使用 S3 存储**，配合 CDN 加速
4. **定期备份数据库和文件**
5. **监控日志和资源使用**
6. **设置防火墙规则**，限制管理端口访问

详细部署指南请参考：[部署文档](docs/DEPLOYMENT.md)

## 📞 支持与反馈

- 发现 bug？[提交 Issue](https://github.com/yaotutu/folder2podcast/issues)
- 有建议？[参与讨论](https://github.com/yaotutu/folder2podcast/discussions)
- 想贡献代码？[提交 PR](https://github.com/yaotutu/folder2podcast/pulls)

## 📄 开源协议

[ISC License](LICENSE)

---

<div align="center">

**如果觉得项目对你有帮助，请给个 ⭐Star 支持一下！**

<a href="https://www.producthunt.com/posts/folder2podcast-rss?embed=true">
  <img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=826261&theme=light"
    alt="Folder2Podcast RSS - Local folders to RSS podcast feeds"
    width="250" height="54">
</a>

<br>
<br>

<a href="https://starchart.cc/yaotutu/folder2podcast">
  <img src="https://starchart.cc/yaotutu/folder2podcast.svg" alt="Stargazers over time" width="800">
</a>

</div>
