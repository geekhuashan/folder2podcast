# Folder2Podcast

> 将任意音频文件夹快速转换为专业播客的全栈解决方案

Folder2Podcast 是一个强大的播客管理系统，让你能够**一键将本地音频文件夹转换为可订阅的播客**。支持 Web 界面管理和完整的 HTTP API，轻松集成到任何工作流中。

## ✨ 核心特性

### 🚀 一键上传文件夹创建播客
- **拖拽即创建**：将音频文件夹直接拖入浏览器，自动创建播客并上传所有音频
- **智能元数据提取**：自动提取音频标题、时长、艺术家等信息
- **批量处理**：支持同时上传多个文件夹，快速构建播客库
- **多格式支持**：MP3、M4A、WAV、FLAC、OGG、AAC 等主流音频格式

### 🎨 Web 可视化管理界面
- **现代化 UI**：基于 Material-UI 的精美管理界面
- **播客管理**：创建、编辑、删除播客，管理封面和元数据
- **剧集管理**：编辑剧集信息、自定义排序、批量操作
- **实时预览**：即时查看 RSS Feed 和播客详情
- **上传进度**：实时显示文件上传进度和状态

### 🔌 强大的 HTTP API
- **RESTful 接口**：标准化的 API 设计，易于集成
- **工作流协作**：通过 API 连接 n8n、Zapier 等自动化工具
- **OpenAPI 文档**：自动生成的 API 文档，开箱即用
- **Access Key 认证**：安全的 API 密钥认证机制
- **多用户支持**：每个用户拥有独立的播客库和权限

### 📡 标准 RSS Feed
- **全平台兼容**：支持 Apple Podcasts、Spotify、Google Podcasts 等所有播客客户端
- **RSS 2.0 + iTunes 扩展**：符合播客行业标准
- **自动同步**：文件更新自动反映到 Feed 中

## 🎯 典型使用场景

- **个人播客创作**：将录音文件快速发布为播客
- **音频课程分发**：将教学音频转换为可订阅的播客课程
- **内部培训**：企业内部音频培训材料管理
- **自动化工作流**：通过 API 集成到现有的内容生产流程
- **播客托管服务**：搭建私有播客托管平台

## 📦 快速开始

### 方式一：Docker 部署（推荐）

Docker 部署是最简单快捷的方式，无需配置环境依赖。

#### 1. 使用 Docker Compose（推荐）

创建 `docker-compose.yml` 文件：

```yaml
version: '3.8'

services:
  folder2podcast:
    image: folder2podcast:latest
    container_name: folder2podcast
    ports:
      - "3100:3100"
    volumes:
      - ./podcasts:/podcasts      # 音频文件存储目录
      - ./data:/app/data          # 数据库存储目录
    environment:
      - PORT=3100
      - BASE_URL=http://localhost  # 修改为你的域名或IP
      - ADMIN_USERNAME=admin       # 管理员用户名
      - ADMIN_PASSWORD=your_secure_password  # 管理员密码
      - ENABLE_REGISTRATION=false  # 可选：关闭公开注册
    restart: unless-stopped
```

启动服务：

```bash
# 构建镜像
docker build -t folder2podcast .

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

#### 2. 直接使用 Docker

```bash
# 构建镜像
docker build -t folder2podcast .

# 运行容器
docker run -d \
  --name folder2podcast \
  -p 3100:3100 \
  -v $(pwd)/podcasts:/podcasts \
  -v $(pwd)/data:/app/data \
  -e BASE_URL=http://localhost \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=your_secure_password \
  folder2podcast
```

访问 `http://localhost:3100` 即可开始使用。

### 方式二：NPM 本地运行

适合开发环境或需要自定义配置的场景。

#### 环境要求

- Node.js 20+
- npm 或 yarn
- SQLite（已内置）

#### 安装步骤

```bash
# 1. 克隆项目
git clone <repository-url>
cd folder2podcast

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置 BASE_URL、管理员账号等

# 4. 初始化数据库
npm run db:migrate

# 5. （可选）创建用户
npm run create-user
# 按提示输入用户名和密码，系统会生成 Access Key

# 6. 启动开发服务器
npm run dev

# 或者构建后运行生产版本
npm run build
npm start
```

访问 `http://localhost:3100` 开始使用。

## 🔧 环境变量配置

在 `.env` 文件中配置以下参数：

```env
# 服务器配置
PORT=3100                          # 服务器端口
BASE_URL=http://localhost          # 服务器基础 URL（生产环境改为你的域名）

# 数据库配置
DATABASE_URL=./data/podcasts.db    # 数据库文件路径

# 认证配置
ENABLE_REGISTRATION=true           # 是否允许用户注册（false 则只能使用管理员账号）
ADMIN_USERNAME=admin               # 管理员用户名
ADMIN_PASSWORD=your_password       # 管理员密码
```

### 配置说明

- **BASE_URL**：非常重要！必须设置为你的服务器实际访问地址
  - 开发环境：`http://localhost`
  - 局域网：`http://192.168.1.100`
  - 生产环境：`http://your-domain.com` 或 `https://your-domain.com`

- **管理员账号**：设置后会自动生成管理员 Access Key，可直接登录使用

## 📖 使用指南

### 1. 获取 Access Key

#### 方式 A：使用管理员账号（推荐）

如果你在 `.env` 中配置了管理员账号：

1. 访问 `http://localhost:3100`
2. 使用管理员用户名和密码登录
3. 系统会自动返回 Access Key

#### 方式 B：创建普通用户

```bash
# 如果允许注册，可以在 Web 界面注册
# 或使用命令行创建用户
npm run create-user

# 按提示输入用户名和密码
# 系统会显示生成的 Access Key：fp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 2. Web 界面管理

访问 `http://localhost:3100`，输入 Access Key 登录。

#### 快速创建播客 - 文件夹拖拽

1. 点击"上传文件夹"或直接拖拽音频文件夹到浏览器
2. 系统自动：
   - 创建播客（使用文件夹名作为标题）
   - 上传所有音频文件
   - 提取音频元数据
   - 生成 RSS Feed
3. 上传完成后可在播客列表查看

#### 播客管理

- **编辑播客**：修改标题、描述、作者、分类、封面等信息
- **管理剧集**：点击播客卡片进入剧集管理页面
  - 编辑剧集标题和描述
  - 自定义剧集排序
  - 上传剧集封面
  - 删除剧集
- **删除播客**：可选择是否同时删除音频文件

#### 订阅播客

每个播客都有独立的 RSS Feed 地址，点击"复制订阅链接"即可获取：

```
http://localhost:3100/feed/{username}/{dirName}
```

将此链接添加到任何播客客户端（Apple Podcasts、Spotify、Pocket Casts 等）即可订阅。

### 3. API 调用

Folder2Podcast 提供完整的 RESTful API，可以集成到自动化工作流中。

#### API 文档

访问 `http://localhost:3100/api-docs` 查看完整的 OpenAPI 文档。

#### 认证方式

所有 API 请求需要在 Header 中携带 Access Key：

```bash
Authorization: Bearer fp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### 常用 API 示例

**登录获取 Access Key**

```bash
curl -X POST http://localhost:3100/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your_password"
  }'
```

**创建播客**

```bash
curl -X POST http://localhost:3100/api/v1/podcasts \
  -H "Authorization: Bearer fp_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "dirName": "my-podcast",
    "title": "我的播客",
    "description": "这是一个测试播客",
    "author": "作者名",
    "language": "zh-CN",
    "category": "Technology"
  }'
```

**上传音频文件**

```bash
curl -X POST http://localhost:3100/api/v1/upload \
  -H "Authorization: Bearer fp_xxx" \
  -F "file=@episode01.mp3" \
  -F "podcastId=podcast-uuid-here"
```

**获取播客列表**

```bash
curl -X GET http://localhost:3100/api/v1/podcasts \
  -H "Authorization: Bearer fp_xxx"
```

**获取 RSS Feed（无需认证）**

```bash
curl http://localhost:3100/feed/{username}/{dirName}
```

#### 工作流集成示例

**与 n8n 集成**

1. 使用 HTTP Request 节点调用 API
2. 设置 Header：`Authorization: Bearer fp_xxx`
3. 配置请求类型和参数
4. 可实现自动上传、定时同步等功能

**与 Zapier 集成**

1. 使用 Webhooks 或 HTTP Request
2. 配置认证和请求参数
3. 连接到其他服务（如云存储、邮件等）

## 🛠️ 技术栈

### 前端
- **框架**：Next.js 16 + React 19
- **UI 库**：Material-UI (MUI)
- **状态管理**：Zustand + SWR
- **表单处理**：React Hook Form + Zod
- **文件上传**：react-dropzone

### 后端
- **运行时**：Next.js App Router
- **数据库**：SQLite + Drizzle ORM
- **音频处理**：music-metadata + ffprobe
- **RSS 生成**：podcast (npm)
- **认证**：Access Key + bcrypt

### DevOps
- **容器化**：Docker + Docker Compose
- **代码规范**：Biome
- **API 文档**：next-openapi-gen

## 📂 项目结构

```
folder2podcast/
├── app/                    # Next.js App Router
│   ├── api/v1/            # API 路由
│   │   ├── auth/          # 认证接口
│   │   ├── podcasts/      # 播客管理接口
│   │   └── upload/        # 文件上传接口
│   ├── feed/              # RSS Feed 生成
│   └── page.tsx           # Web 管理界面
├── components/            # React 组件
├── lib/                   # 核心业务逻辑
│   ├── db/               # 数据库模型和查询
│   ├── services/         # 业务服务
│   ├── utils/            # 工具函数
│   └── schemas/          # 数据验证模型
├── audio/                # 音频文件存储目录
├── data/                 # 数据库文件
├── Dockerfile            # Docker 配置
├── docker-compose.yml    # Docker Compose 配置（需创建）
└── .env                  # 环境变量配置
```

## 🔒 安全建议

1. **修改默认密码**：部署到生产环境时，务必修改 `ADMIN_PASSWORD`
2. **使用 HTTPS**：生产环境建议配置 SSL 证书
3. **限制注册**：如果不需要多用户，设置 `ENABLE_REGISTRATION=false`
4. **防火墙配置**：限制 API 访问来源
5. **定期备份**：备份 `data/` 目录和 `audio/` 目录

## 🐛 常见问题

### Q: 上传文件时提示"文件太大"

A: 默认最大文件大小为 500MB（音频）和 10MB（图片）。可以在 `lib/config.ts` 中调整 `maxFileSize` 配置。

### Q: RSS Feed 无法在播客客户端订阅

A: 检查 `BASE_URL` 是否配置正确，必须是外网可访问的地址，不能是 `localhost`。

### Q: Docker 部署后无法访问

A:
1. 检查端口映射是否正确：`-p 3100:3100`
2. 检查防火墙是否开放 3100 端口
3. 检查 `BASE_URL` 环境变量是否正确

### Q: 如何批量导入已有音频文件？

A: 将音频文件按文件夹组织，然后在 Web 界面拖拽整个文件夹即可批量创建播客。

### Q: 支持哪些音频格式？

A: 支持 MP3、M4A、WAV、FLAC、OGG、AAC 等主流格式。建议使用 MP3 或 M4A 以获得最佳兼容性。

## 📝 开发相关

### 数据库管理

```bash
# 生成数据库迁移文件
npm run db:generate

# 执行迁移
npm run db:migrate

# 打开数据库管理界面
npm run db:studio
```

### 代码规范

```bash
# 检查代码规范
npm run lint

# 自动格式化代码
npm run format
```

### 重置数据

```bash
# 警告：此操作会删除所有数据！
npm run reset
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🙏 致谢

感谢所有开源项目的贡献者，特别是：

- [Next.js](https://nextjs.org/)
- [Material-UI](https://mui.com/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [music-metadata](https://github.com/borewit/music-metadata)

---

**开始使用 Folder2Podcast，让播客创作更简单！** 🎙️
