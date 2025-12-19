[![SVG Banners](https://svg-banners.vercel.app/api?type=rainbow&text1=Folder2Podcast📻&width=800&height=400)](https://github.com/Akshay090/svg-banners)

# 🎙️ Folder2Podcast RSS

> 一键将本地音频文件夹转换为私人播客 RSS 订阅源，零侵入、 无副作用

[English Version](README.en.md)


## 目录

- [🎙️ Folder2Podcast RSS](#️-folder2podcast-rss)
  - [目录](#目录)
  - [项目背景](#项目背景)
  - [✨ 核心功能](#-核心功能)
  - [🚀 快速开始](#-快速开始)
    - [Docker 一键部署（推荐）](#docker-一键部署推荐)
  - [Docker 镜像说明](#docker-镜像说明)
  - [📱 效果展示](#-效果展示)
    - [播客客户端显示效果](#播客客户端显示效果)
  - [📦 目录结构规范](#-目录结构规范)
  - [⚙️ 配置说明](#️-配置说明)
    - [环境变量](#环境变量)
    - [podcast.json 配置](#podcastjson-配置)
  - [🎨 高级特性](#-高级特性)
    - [📱 Web 界面](#-web-界面)
    - [🎯 其他特性](#-其他特性)
  - [📱 客户端支持](#-客户端支持)
  - [故障排查](#故障排查)
  - [�通知](#通知)
  - [📋 支持与反馈](#-支持与反馈)
  - [更新日志](#更新日志)
  - [代托管与技术支持](#代托管与技术支持)

## 项目背景

播客 RSS 是一个强大的音频分发标准，它不仅仅是一个简单的音频列表，更提供了：

- 🔖 完整的播放进度记录
- 🎯 精确的断点续播功能
- 🔄 跨设备的收听历史同步
- 📱 多平台收听支持
- 🎨 丰富的媒体信息展示

Folder2Podcast RSS 让您可以轻松地把本地音频文件夹转换为私人播客 RSS 源，享受专业播客客户端的所有高级特性：

- 🎧 使用您最喜欢的播客应用收听（如 Apple Podcasts、Pocket Casts）
- 📱 在任何设备上继续上次的收听进度
- 🔄 自动同步多设备间的收听历史
- 📚 系统化管理您的有声内容库
- 🎯 智能记住每个音频的播放位置

只需一个命令部署，让您的本地音频秒变私人播客订阅源。

## ✨ 核心功能

- 🔒 **零侵入设计** - 以只读方式访问音频文件，不修改原始文件夹结构和内容
- 🎯 **标准 RSS 实现** - 完整支持播客 RSS 2.0 规范和 iTunes 专有标签
- 📱 **完美客户端兼容** - 适配所有主流播客客户端
- 🔄 **智能序列化** - 自动分析文件名构建剧集顺序，生成发布时间
- 🎨 **个性化配置** - 支持播客元数据自定义（标题、作者、封面等）
- 🚀 **容器化部署** - 提供 Docker 一键部署方案

## 🚀 快速开始

### Docker 一键部署（推荐）

1. **准备工作**
   - 安装 Docker
   - 准备音频文件目录（按播客内容分文件夹）
   - 规范文件命名（如：01-第一章.mp3、第02集.mp3）

⚠️ **重要：BASE_URL 配置说明**

在部署到服务器时，必须正确配置 BASE_URL 环境变量，这直接影响到：
- RSS feed 中的音频文件链接
- 封面图片链接
- 所有静态资源的访问路径

正确配置示例：
```bash
# 本地测试时
BASE_URL=http://localhost:3100

# 部署到服务器时（请替换为实际的服务器IP或域名）
BASE_URL=http://192.168.55.222:3000
# 或者
BASE_URL=http://your-domain.com
```

注意事项：
- BASE_URL 必须包含协议前缀（http:// 或 https://）
- 如果使用了自定义端口，必须包含端口号
- 结尾不要添加斜杠 '/'
- 确保该地址可以从客户端（如播客APP）访问到

2. **启动服务**

   方式一：Docker 命令直接运行
   ```bash
   docker run -d \
     -p 3000:3000 \
     -v /path/to/audiobooks:/podcasts \
     -e PORT=3000 \
     -e BASE_URL=http://your-server-ip:3000 \
     -e PUID=$(id -u) \
     -e PGID=$(id -g) \
     yaotutu/folder2podcast
   ```

   方式二：使用 Docker Compose（推荐）
   ```yaml
   # docker-compose.yml
   version: '3.8'
   services:
     folder2podcast:
       image: yaotutu/folder2podcast
       ports:
         - "3000:3000"
       volumes:
         - ./audiobooks:/podcasts:ro  # 以只读模式挂载
       environment:
         - PORT=3000
         - AUDIO_DIR=/podcasts
         - BASE_URL=http://your-server-ip:3000
         - PUID=1000  # 替换为您的用户ID
         - PGID=1000  # 替换为您的用户组ID
       restart: unless-stopped
       healthcheck:
         test: ["CMD", "wget", "-q", "--spider", "http://localhost:3100/podcasts"]
         interval: 30s
         timeout: 10s
         retries: 3
   ```

   > **权限说明**：
   > - 在某些情况下，Docker 容器可能无法正常读写您的音频文件夹
   > - 这时您需要设置 `PUID` 和 `PGID` 这两个环境变量
   > - 这两个值应该设置为您的音频文件夹所有者的用户ID和组ID
   > - 在 Mac/Linux 系统中，只需在终端运行 `id -u` 和 `id -g` 即可获取这两个值
   > - 设置正确的值后，应用就能正常访问您的音频文件了

3. **验证部署**
   - 访问 `http://localhost:3100/podcasts` 确认服务运行
   - 检查播客列表是否正确显示
   - 测试音频文件访问

## Docker 镜像说明

- `yaotutu/folder2podcast:main` - 开发版本，与 main 分支同步更新，包含最新特性
- `yaotutu/folder2podcast:latest` - 稳定版本，经过测试后发布，建议生产环境使用
  
## 📱 效果展示

### 播客客户端显示效果

![播客客户端显示效果](docs/images/podcast-client-preview.png)

*图示：在 Apple Podcasts 中的显示效果*

要获取类似截图：
1. 使用任意播客客户端（如 Apple Podcasts）订阅您的播客
2. 等待内容同步完成
3. 截取播客详情页面的屏幕截图


## 📦 目录结构规范

标准的目录结构组织方式：

```
assets/
├── web/          # Web 界面相关文件
├── image/        # 图片资源
audio/            # 播客音频文件
├── podcast1/
│   ├── episode1.mp3
│   └── cover.jpg
└── podcast2/
    ├── episode1.mp3
    └── cover.jpg
```

## ⚙️ 配置说明

### 环境变量

**配置方式：**

项目支持多种环境变量配置方式，按优先级从高到低：

1. **系统环境变量** - 直接在命令行或 Docker 中设置
2. **`.env.local`** - 本地开发配置（不提交到 Git）
3. **`.env`** - 通用配置（不提交到 Git）
4. **`.env.development` 或 `.env.production`** - 环境特定配置（已包含在项目中）

**快速配置：**

```bash
# 复制示例配置文件
cp .env.example .env

# 编辑 .env 文件，修改为你的实际配置
nano .env
```

**可用环境变量：**

| 环境变量       | 说明               | 默认值                    | 示例                         |
| -------------- | ------------------ | ------------------------- | ---------------------------- |
| `AUDIO_DIR`    | 音频文件根目录路径 | `./audio`                 | `/path/to/audiobooks`        |
| `PORT`         | 服务器监听端口     | `3100`                    | `8080`                       |
| `BASE_URL`     | 服务器基础URL      | `http://localhost:端口号` | `http://192.168.55.222:3100` |
| `TITLE_FORMAT` | 剧集标题显示格式   | `full`                    | `clean` 或 `full`            |
| `API_KEY`      | Management API 密钥（可选） | 无     | `your-secret-key`            |
| `NODE_ENV`     | 运行环境          | `development`             | `production`                 |
| `PUID`         | 音频文件夹所有者ID（Docker） | `1000`    | 运行 `id -u` 获取      |
| `PGID`         | 音频文件夹用户组ID（Docker） | `1000`    | 运行 `id -g` 获取      |

**API_KEY 说明：**
- 如果设置了 `API_KEY`，则所有 Management API 请求都需要在查询参数中提供 `apiKey`
- 如果未设置，则 Management API 不需要认证（仅用于内网环境）
- 只读 API（如 `/podcasts`、`/feeds`）不受影响，始终公开访问
- 生成安全密钥：`openssl rand -hex 32`

### podcast.json 配置

```json
{
  "title": "播客标题",
  "description": "播客描述",
  "author": "作者名称",
  "email": "author@example.com",
  "language": "zh-cn",
  "category": "Technology",
  "explicit": false,
  "websiteUrl": "https://example.com",
  "titleFormat": "clean",
  "episodeNumberStrategy": "first",  // 剧集序号提取策略，可选值：prefix（默认）, suffix, first, last, 或 { pattern: "正则表达式" }
  "useMTime": false  // 是否使用文件创建时间作为发布时间，默认为 false
}
```

> 📝 **时间管理说明**：
> - 当 `useMTime` 为 `false`（默认值）时：
>   - 带序号的文件使用序号生成发布时间
>   - 不带序号的文件使用文件创建时间
> - 当 `useMTime` 为 `true` 时：
>   - 所有文件都使用文件的创建时间作为发布时间
>   - 忽略文件名中的序号信息
> - 详细说明请参考[详细使用指南](docs/advanced-guide.md)

## 🎨 高级特性

### 🔧 Management API（管理 API）

V2 版本新增了强大的管理 API，支持通过 HTTP 接口管理播客内容：

**核心功能：**
- 📤 **文件管理** - 上传、下载、删除、重命名音频文件和图片
- ⚙️ **配置管理** - 在线编辑播客元数据和解析选项
- 🔄 **缓存控制** - 手动刷新 RSS feed 缓存
- 🔒 **API Key 认证** - 可选的简单认证机制
- 🌐 **完整 CORS 支持** - 支持跨域访问，便于前后端分离开发

**快速开始：**

```bash
# 设置 API Key（可选）
export API_KEY="your-secret-key"

# 上传音频文件
curl -X POST \
  "http://localhost:3100/api/v2/manage/podcasts/my-podcast/files?apiKey=your-secret-key" \
  -F "file=@episode.mp3"

# 更新播客配置
curl -X PATCH \
  "http://localhost:3100/api/v2/manage/podcasts/my-podcast/config/metadata?apiKey=your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{"title": "新标题", "description": "新描述"}'

# 列出所有文件
curl "http://localhost:3100/api/v2/manage/podcasts/my-podcast/files?apiKey=your-secret-key"
```

**API 端点：**
- `GET /api/v2/manage/podcasts/:podcast/files` - 列出文件
- `POST /api/v2/manage/podcasts/:podcast/files` - 上传文件
- `DELETE /api/v2/manage/podcasts/:podcast/files/:file` - 删除文件
- `PATCH /api/v2/manage/podcasts/:podcast/files/:file` - 重命名文件
- `GET /api/v2/manage/podcasts/:podcast/config` - 获取配置
- `PUT /api/v2/manage/podcasts/:podcast/config` - 更新配置（完整）
- `PATCH /api/v2/manage/podcasts/:podcast/config/metadata` - 更新元数据（部分）
- `PATCH /api/v2/manage/podcasts/:podcast/config/parsing` - 更新解析选项（部分）
- `DELETE /api/v2/manage/podcasts/:podcast/config` - 删除配置
- `POST /api/v2/manage/podcasts/:podcast/refresh` - 刷新缓存

**详细文档：** [Management API 完整文档](docs/MANAGEMENT_API.md)

### 📱 Web 界面
项目提供了一个友好的 Web 界面，方便用户：
- 查看所有可用的播客源
- 一键复制订阅地址
- 支持多个主流播客客户端的一键订阅
  - Apple Podcasts
  - Overcast
  - Pocket Casts
  - Castro
  - Moon FM
  - 更多客户端持续添加中...

![Web 界面预览](docs/images/web-interface.png)

### 🎯 其他特性
- 智能文件名处理
- 自动序列化
- 别名路由
- 封面图片管理
- 多设备同步

详细说明请参考[详细使用指南](docs/advanced-guide.md)。

## 📱 客户端支持

支持所有标准播客客户端：
- Apple Podcasts
- Pocket Casts
- Overcast
- Castro
- Google Podcasts
- AntennaPod

## 故障排查

常见问题和解决方案请参考[故障排查指南](docs/troubleshooting.md)。

## 📢通知
该项目已趋于稳定，目前未发现已知 Bug，您可以放心使用。如遇问题，欢迎提交 Issue，我会及时进行修复和更新。


## 📋 支持与反馈

- 发现 bug？[提交 Issue](https://github.com/your-repo/folder2podcast/issues)
- 有建议？[参与讨论](https://github.com/your-repo/folder2podcast/discussions)
- 想贡献代码？[提交 PR](https://github.com/your-repo/folder2podcast/pulls)

## 更新日志

查看完整的更新历史请访问 [CHANGELOG.md](CHANGELOG.md)

## 代托管与技术支持

- **播客托管服务**：提供专业的托管和订阅服务
- **付费技术支持**：提供私有部署、环境配置等技术支持服务

如需以上服务，请通过微信联系 

<div align="center">

<table>
  <tr>
    <td align="center">
      <img src="docs/images/wechat.jpg" width="280" alt="微信群">
      <br>
      👆 欢迎扫码加好友提供技术支持！
    </td>
    <td align="center">
      <img src="docs/images/sponsor.jpg" width="280" alt="赞赏码">
      <br>
      👆 如果觉得项目对你有帮助，欢迎赞赏支持！
    </td>
  </tr>
</table>

<br>

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
