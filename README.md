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

根据使用场景选择部署模式：

#### 模式一：私有部署（仅自己使用，指定管理员账号）

适用于个人使用或小团队，通过环境变量指定管理员账号，无需注册。

**Docker 命令：**

```bash
docker run -d \
  --name folder2podcast \
  -p 3100:3100 \
  -v /path/to/audio:/app/audio \
  -v /path/to/data:/app/data \
  -e BASE_URL=http://your-server-ip \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=your_secure_password \
  --restart unless-stopped \
  yaotutu/folder2podcast:latest
```

**Docker Compose：**

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  folder2podcast:
    image: yaotutu/folder2podcast:latest
    container_name: folder2podcast
    ports:
      - "3100:3100"
    volumes:
      - ./audio:/app/audio        # 音频文件存储目录
      - ./data:/app/data          # 数据库存储目录
    environment:
      - BASE_URL=http://192.168.1.100  # 修改为你的服务器IP或域名
      - ADMIN_USERNAME=admin            # 管理员用户名
      - ADMIN_PASSWORD=your_secure_password  # 管理员密码（请务必修改）
    restart: unless-stopped
```

启动：

```bash
docker-compose up -d
```

**启动后日志会显示：**

```
👤 检测到 1 个初始用户，开始创建...
  ✅ 用户 "admin" 创建成功
     Access Key: fp_xxxxxxxxxx

🔒 注册功能已关闭（固定用户模式）
   其他用户无法通过注册页面创建账号
```

使用管理员用户名和密码登录即可。

#### 模式二：固定多用户模式（团队部署）

适用于团队协作场景，通过环境变量批量创建固定用户，禁止公开注册。

**Docker 命令：**

```bash
docker run -d \
  --name folder2podcast \
  -p 3100:3100 \
  -v /path/to/audio:/app/audio \
  -v /path/to/data:/app/data \
  -e BASE_URL=http://your-server-ip \
  -e USERS=admin:pass123,alice:pass456,bob:pass789 \
  --restart unless-stopped \
  yaotutu/folder2podcast:latest
```

**Docker Compose：**

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  folder2podcast:
    image: yaotutu/folder2podcast:latest
    container_name: folder2podcast
    ports:
      - "3100:3100"
    volumes:
      - ./audio:/app/audio        # 音频文件存储目录
      - ./data:/app/data          # 数据库存储目录
    environment:
      - BASE_URL=http://192.168.1.100  # 修改为你的服务器IP或域名
      - USERS=admin:pass123,alice:pass456,bob:pass789  # 固定用户列表
    restart: unless-stopped
```

启动：

```bash
docker-compose up -d
```

**启动后日志会显示：**

```
👤 检测到 3 个初始用户，开始创建...
  ✅ 用户 "admin" 创建成功
     Access Key: fp_xxxxxxxxxx
  ✅ 用户 "alice" 创建成功
     Access Key: fp_yyyyyyyyyy
  ✅ 用户 "bob" 创建成功
     Access Key: fp_zzzzzzzzzz

🔒 注册功能已关闭（固定用户模式）
   其他用户无法通过注册页面创建账号
```

每个用户可以使用各自的用户名和密码登录。

#### 模式三：公开部署（开放注册，用户自行注册）

适用于多用户场景，允许用户通过注册页面自行创建账号。

**Docker 命令：**

```bash
docker run -d \
  --name folder2podcast \
  -p 3100:3100 \
  -v /path/to/audio:/app/audio \
  -v /path/to/data:/app/data \
  -e BASE_URL=http://your-server-ip \
  --restart unless-stopped \
  yaotutu/folder2podcast:latest
```

**Docker Compose：**

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  folder2podcast:
    image: yaotutu/folder2podcast:latest
    container_name: folder2podcast
    ports:
      - "3100:3100"
    volumes:
      - ./audio:/app/audio        # 音频文件存储目录
      - ./data:/app/data          # 数据库存储目录
    environment:
      - BASE_URL=http://192.168.1.100  # 修改为你的服务器IP或域名
    restart: unless-stopped
```

启动：

```bash
docker-compose up -d
```

**启动后日志会显示：**

```
ℹ️  开放注册模式：未提供初始用户配置
   用户需要通过注册页面自行注册
```

用户访问 `http://your-server-ip:3100` 后在注册页面创建账号。

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

# 5. 启动开发服务器
npm run dev

# 或者构建后运行生产版本
npm run build
npm start
```

访问 `http://localhost:3100` 开始使用。

## 🔧 环境变量配置

### 完整环境变量列表

```env
# ========================================
# 服务器配置
# ========================================
PORT=3100                          # 服务器端口（默认 3100）
BASE_URL=http://localhost          # 服务器基础 URL（必须配置！）

# ========================================
# 数据库配置
# ========================================
DATABASE_URL=./data/podcasts.db    # SQLite 数据库文件路径

# ========================================
# 用户认证配置（三种模式）
# ========================================
# 模式一：单用户模式（私有部署）
# - 设置 ADMIN_USERNAME 和 ADMIN_PASSWORD
# - 容器启动时自动创建管理员用户
# - 自动禁止注册（仅允许管理员使用）
ADMIN_USERNAME=admin               # 管理员用户名（可选）
ADMIN_PASSWORD=your_password       # 管理员密码（可选）

# 模式二：固定多用户模式（团队部署）
# - 设置 USERS（格式：user1:pass1,user2:pass2）
# - 容器启动时批量创建固定用户
# - 自动禁止注册（仅允许指定用户使用）
# - 优先级高于 ADMIN_USERNAME
USERS=admin:pass123,alice:pass456,bob:pass789  # 固定用户列表（可选）

# 模式三：开放注册模式（公开部署）
# - 不设置 ADMIN_USERNAME 和 USERS
# - 自动允许用户通过 /register 页面自行注册
# - 适合公开服务或需要开放注册的场景
# （留空或不配置）
```

### 配置说明

#### 1. BASE_URL（重要！必须配置）

RSS Feed 和文件 URL 都基于此地址生成，**必须设置为服务器的实际访问地址**：

- **本地开发**：`http://localhost`
- **局域网部署**：`http://192.168.1.100`（局域网 IP）
- **公网部署**：`http://your-domain.com` 或 `https://your-domain.com`

**错误示例**：
```bash
# ❌ 错误：使用 localhost 会导致外部设备无法订阅
BASE_URL=http://localhost

# ✅ 正确：使用服务器实际 IP
BASE_URL=http://192.168.1.100
```

#### 2. 用户认证配置（三种模式）

**模式一：单用户模式（推荐个人使用）**

```bash
# 设置管理员用户名和密码
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
```

特点：
- ✅ 容器启动时自动创建管理员账号
- ✅ 自动禁止注册（仅允许管理员使用）
- ✅ 无需手动注册，直接登录
- ✅ 适合个人或单用户使用
- ⚠️ 请务必修改默认密码！

**模式二：固定多用户模式（推荐团队使用）**

```bash
# 设置固定用户列表（逗号分隔，格式：username:password）
USERS=admin:pass123,alice:pass456,bob:pass789
```

特点：
- ✅ 容器启动时批量创建所有用户
- ✅ 自动禁止注册（仅允许指定用户使用）
- ✅ 每个用户拥有独立的播客库
- ✅ 适合固定团队协作
- ⚠️ 优先级高于 ADMIN_USERNAME（同时设置时会忽略 ADMIN_USERNAME）
- ⚠️ 请注意密码安全，建议使用环境变量管理工具

**模式三：开放注册模式（公开服务）**

```bash
# 不设置 ADMIN_USERNAME 和 USERS
# 或完全删除这两个环境变量
```

特点：
- ✅ 自动允许注册（任何人都可以注册账号）
- ✅ 用户通过注册页面自行创建账号
- ✅ 支持多用户独立播客库
- ✅ 适合公开服务或需要开放注册的场景
- ⚠️ 注意控制注册权限和存储空间

#### 3. DATABASE_URL

SQLite 数据库文件路径，默认为 `./data/podcasts.db`。

Docker 部署时建议使用 Volume 挂载：
```bash
-v /path/to/data:/app/data
```

### 环境变量优先级

Docker 启动时的优先级：
1. Docker 命令行 `-e` 参数（最高优先级）
2. Docker Compose 的 `environment` 配置
3. `.env` 文件（本地开发）
4. 默认值

### 配置示例

**示例一：个人播客（单用户模式）**

```env
BASE_URL=https://podcast.example.com
ADMIN_USERNAME=myblog
ADMIN_PASSWORD=super_secret_password_123
```

**示例二：团队协作（固定多用户模式）**

```env
BASE_URL=http://192.168.10.50
USERS=admin:admin123,alice:alice456,bob:bob789
```

**示例三：公开播客托管服务（开放注册模式）**

```env
BASE_URL=https://podcast-host.com
# 不设置 ADMIN_USERNAME 和 USERS
# 用户自行注册
```

## 📖 使用指南

### 1. 首次登录

根据你的部署模式选择登录方式：

#### 模式一：单用户模式

如果你在启动容器时设置了 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD`：

1. 访问 `http://your-server-ip:3100`
2. 输入管理员用户名和密码登录
3. 系统会返回你的 Access Key（用于 API 调用）

Access Key 格式：`fp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

#### 模式二：固定多用户模式

如果你在启动容器时设置了 `USERS`：

1. 访问 `http://your-server-ip:3100`
2. 使用你在 `USERS` 中配置的任意用户名和密码登录
3. 每个用户拥有独立的 Access Key 和播客库

**示例**：如果配置了 `USERS=admin:pass123,alice:pass456`
- 可以使用 `admin` / `pass123` 登录
- 也可以使用 `alice` / `pass456` 登录

#### 模式三：开放注册模式

如果你没有设置 `ADMIN_USERNAME` 和 `USERS`：

1. 访问 `http://your-server-ip:3100`
2. 点击"注册"按钮创建新账号
3. 输入用户名和密码
4. 注册成功后自动登录，获得 Access Key

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

### Docker 部署安全

1. **务必修改默认密码**
   ```bash
   # ❌ 危险：使用默认密码
   -e ADMIN_PASSWORD=admin

   # ✅ 安全：使用强密码
   -e ADMIN_PASSWORD=MyStr0ng_P@ssw0rd_2024
   ```

2. **私有部署模式（推荐）**
   - 设置 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD`
   - 仅供个人或团队内部使用
   - 不对外开放注册

3. **公开部署需谨慎**
   - 如果不设置管理员账号，任何人都可以注册
   - 建议配置存储配额限制
   - 建议设置定期清理策略

### 生产环境建议

1. **使用 HTTPS**
   ```bash
   # 配置反向代理（Nginx/Caddy）
   BASE_URL=https://your-domain.com
   ```

2. **限制网络访问**
   ```bash
   # 仅允许局域网访问
   -p 127.0.0.1:3100:3100

   # 或配置防火墙规则
   ufw allow from 192.168.1.0/24 to any port 3100
   ```

3. **定期备份数据**
   ```bash
   # 备份数据库和音频文件
   tar -czf backup-$(date +%Y%m%d).tar.gz data/ audio/
   ```

4. **监控资源使用**
   ```bash
   # 查看容器资源占用
   docker stats folder2podcast
   ```

5. **日志管理**
   ```bash
   # 限制日志大小
   docker run -d \
     --log-opt max-size=10m \
     --log-opt max-file=3 \
     ...
   ```

## 🐛 常见问题

### Q: Docker 启动后没有默认用户，无法登录怎么办？

A: 这取决于你的部署模式：

**情况一：单用户模式**
- 确保启动时设置了 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD`
- 查看容器日志确认用户是否创建成功：
  ```bash
  docker logs folder2podcast
  ```
- 应该能看到 "✅ 用户 'xxx' 创建成功" 的日志

**情况二：固定多用户模式**
- 确保启动时设置了 `USERS=user1:pass1,user2:pass2`
- 查看容器日志确认所有用户是否创建成功
- 应该能看到 "👤 检测到 N 个初始用户，开始创建..." 的日志

**情况三：开放注册模式**
- 如果没有设置 `ADMIN_USERNAME` 和 `USERS`，访问注册页面创建用户

### Q: 如何切换部署模式？

A:
- **切换到单用户模式**：设置 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD`，重启容器
- **切换到固定多用户模式**：设置 `USERS=user1:pass1,user2:pass2`，重启容器
- **切换到开放注册模式**：移除 `ADMIN_USERNAME` 和 `USERS` 环境变量，重启容器
- 已创建的用户不会被删除，仍然可以正常使用

**注意**：`USERS` 优先级高于 `ADMIN_USERNAME`，如果同时设置，只会创建 `USERS` 中的用户。

### Q: 忘记密码怎么办？

A: 进入容器重置密码：

```bash
# 进入容器
docker exec -it folder2podcast sh

# 使用 SQLite 修改密码
cd /app
sqlite3 data/podcasts.db
> UPDATE users SET password = 'new_password' WHERE username = 'admin';
> .quit
```

或者删除数据库重新开始（会丢失所有数据）：

```bash
docker exec -it folder2podcast sh
rm -f /app/data/podcasts.db*
# 重启容器会自动初始化
```

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
