# Management API 文档

## 概述

Folder2Podcast Management API 提供了完整的文件管理和配置管理接口，允许通过 HTTP API 管理播客内容。

## 认证

API 使用简单的查询参数认证方式。如果设置了环境变量 `API_KEY`，则所有管理 API 请求都需要在查询参数中提供 `apiKey`。

```bash
# 设置 API Key 环境变量
export API_KEY="your-secret-key"

# 请求示例
curl "http://localhost:3100/api/v2/manage/podcasts/my-podcast/files?apiKey=your-secret-key"
```

如果没有设置 `API_KEY` 环境变量，则不需要认证。

## CORS 配置

API 已配置为允许全部跨域访问：
- 允许所有来源 (`origin: true`)
- 允许携带凭证 (`credentials: true`)
- 支持的 HTTP 方法：GET, POST, PUT, DELETE, PATCH, OPTIONS

## API 端点

### 文件管理

#### 1. 列出文件
列出指定播客目录下的所有文件。

```http
GET /api/v2/manage/podcasts/:podcastDir/files
```

**参数:**
- `podcastDir` (路径参数): 播客目录名称
- `apiKey` (查询参数, 可选): API 密钥

**响应:**
```json
{
  "data": {
    "audio": ["episode1.mp3", "episode2.mp3"],
    "images": ["cover.jpg"],
    "others": ["notes.txt"]
  },
  "metadata": {
    "podcast": "my-podcast",
    "totalAudio": 2,
    "totalImages": 1,
    "totalOthers": 1
  }
}
```

#### 2. 上传文件
上传音频文件或图片到指定播客目录。

```http
POST /api/v2/manage/podcasts/:podcastDir/files
Content-Type: multipart/form-data
```

**参数:**
- `podcastDir` (路径参数): 播客目录名称
- `file` (表单数据): 要上传的文件
- `apiKey` (查询参数, 可选): API 密钥

**支持的文件格式:**
- 音频: .mp3, .m4a, .wav, .flac, .aac, .ogg, .opus
- 图片: .jpg, .jpeg, .png, .gif, .webp

**文件大小限制:** 500MB

**响应:**
```json
{
  "message": "File uploaded successfully",
  "filename": "episode3.mp3"
}
```

**示例:**
```bash
curl -X POST \
  "http://localhost:3100/api/v2/manage/podcasts/my-podcast/files?apiKey=your-secret-key" \
  -F "file=@/path/to/episode.mp3"
```

#### 3. 删除文件
删除指定的音频文件或图片。

```http
DELETE /api/v2/manage/podcasts/:podcastDir/files/:fileName
```

**参数:**
- `podcastDir` (路径参数): 播客目录名称
- `fileName` (路径参数): 文件名（需要 URL 编码）
- `apiKey` (查询参数, 可选): API 密钥

**响应:**
```json
{
  "message": "File deleted successfully"
}
```

**示例:**
```bash
curl -X DELETE \
  "http://localhost:3100/api/v2/manage/podcasts/my-podcast/files/episode1.mp3?apiKey=your-secret-key"
```

#### 4. 重命名文件
重命名指定的文件。

```http
PATCH /api/v2/manage/podcasts/:podcastDir/files/:fileName
Content-Type: application/json
```

**参数:**
- `podcastDir` (路径参数): 播客目录名称
- `fileName` (路径参数): 原文件名（需要 URL 编码）
- `apiKey` (查询参数, 可选): API 密钥

**请求体:**
```json
{
  "newName": "new-episode-name.mp3"
}
```

**响应:**
```json
{
  "message": "File renamed successfully"
}
```

**示例:**
```bash
curl -X PATCH \
  "http://localhost:3100/api/v2/manage/podcasts/my-podcast/files/old-name.mp3?apiKey=your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{"newName": "new-name.mp3"}'
```

### 配置管理

#### 5. 获取配置
获取指定播客的配置信息。

```http
GET /api/v2/manage/podcasts/:podcastDir/config
```

**参数:**
- `podcastDir` (路径参数): 播客目录名称
- `apiKey` (查询参数, 可选): API 密钥

**响应:**
```json
{
  "data": {
    "metadata": {
      "title": "我的播客",
      "description": "播客描述",
      "author": "作者名",
      "language": "zh-cn",
      "category": "Technology",
      "explicit": false
    },
    "parsing": {
      "titleFormat": "clean",
      "episodeNumberStrategy": "prefix",
      "useMTime": false
    }
  },
  "exists": true
}
```

#### 6. 更新配置（完整替换）
完整替换播客配置。

```http
PUT /api/v2/manage/podcasts/:podcastDir/config
Content-Type: application/json
```

**参数:**
- `podcastDir` (路径参数): 播客目录名称
- `apiKey` (查询参数, 可选): API 密钥

**请求体:**
```json
{
  "metadata": {
    "title": "我的播客",
    "description": "播客描述",
    "author": "作者名",
    "email": "author@example.com",
    "websiteUrl": "https://example.com",
    "language": "zh-cn",
    "category": "Technology",
    "explicit": false
  },
  "parsing": {
    "titleFormat": "clean",
    "episodeNumberStrategy": "prefix",
    "useMTime": false
  }
}
```

**响应:**
```json
{
  "message": "Config updated successfully"
}
```

#### 7. 更新元数据（部分更新）
部分更新播客元数据。

```http
PATCH /api/v2/manage/podcasts/:podcastDir/config/metadata
Content-Type: application/json
```

**参数:**
- `podcastDir` (路径参数): 播客目录名称
- `apiKey` (查询参数, 可选): API 密钥

**请求体（所有字段都是可选的）:**
```json
{
  "title": "新标题",
  "description": "新描述",
  "author": "新作者",
  "email": "new@example.com",
  "websiteUrl": "https://newsite.com",
  "language": "en-us",
  "category": "Education",
  "explicit": false
}
```

**响应:**
```json
{
  "message": "Metadata updated successfully"
}
```

#### 8. 更新解析选项（部分更新）
部分更新播客解析选项。

```http
PATCH /api/v2/manage/podcasts/:podcastDir/config/parsing
Content-Type: application/json
```

**参数:**
- `podcastDir` (路径参数): 播客目录名称
- `apiKey` (查询参数, 可选): API 密钥

**请求体（所有字段都是可选的）:**
```json
{
  "titleFormat": "full",
  "episodeNumberStrategy": "suffix",
  "useMTime": true
}
```

**解析选项说明:**
- `titleFormat`: 标题格式 (`"clean"` 或 `"full"`)
- `episodeNumberStrategy`: 序号提取策略
  - `"prefix"`: 从文件名开头匹配数字
  - `"suffix"`: 从文件名末尾匹配数字
  - `"first"`: 从左到右找第一个数字
  - `"last"`: 从右到左找最后一个数字
  - `{"pattern": "正则表达式"}`: 使用自定义正则表达式
- `useMTime`: 是否使用文件的修改时间作为发布时间

**响应:**
```json
{
  "message": "Parsing options updated successfully"
}
```

#### 9. 删除配置
删除播客配置文件。

```http
DELETE /api/v2/manage/podcasts/:podcastDir/config
```

**参数:**
- `podcastDir` (路径参数): 播客目录名称
- `apiKey` (查询参数, 可选): API 密钥

**响应:**
```json
{
  "message": "Config deleted successfully"
}
```

### 缓存管理

#### 10. 刷新缓存
手动清除指定播客的 RSS feed 缓存。

```http
POST /api/v2/manage/podcasts/:podcastDir/refresh
```

**参数:**
- `podcastDir` (路径参数): 播客目录名称
- `apiKey` (查询参数, 可选): API 密钥

**响应:**
```json
{
  "message": "Cache refreshed successfully"
}
```

**注意:** 通常不需要手动刷新缓存，因为文件监听器会自动检测变化并清除缓存。此接口主要用于调试或强制刷新。

## 错误处理

所有 API 在出错时都会返回以下格式的错误响应：

```json
{
  "error": "错误类型",
  "message": "详细错误信息"
}
```

**常见错误码:**
- `400 Bad Request`: 请求参数错误
- `401 Unauthorized`: API Key 无效或缺失
- `404 Not Found`: 资源不存在
- `500 Internal Server Error`: 服务器内部错误

## 缓存机制

所有文件操作和配置更新都会自动清除相关播客的 RSS feed 缓存，确保客户端获取最新的播客信息。

RSS feed 缓存 TTL 为 5 分钟。

## 安全注意事项

1. **路径安全**: API 实现了路径安全检查，防止路径穿越攻击
2. **文件类型验证**: 只允许上传指定类型的文件
3. **文件大小限制**: 单个文件最大 500MB
4. **API Key 认证**: 可选的 API Key 认证机制
5. **CORS 配置**: 默认允许全部跨域访问，适合内网自建环境

## 使用示例

### 创建新播客

```bash
# 1. 上传音频文件
curl -X POST \
  "http://localhost:3100/api/v2/manage/podcasts/my-new-podcast/files?apiKey=secret" \
  -F "file=@episode1.mp3"

# 2. 上传封面图片
curl -X POST \
  "http://localhost:3100/api/v2/manage/podcasts/my-new-podcast/files?apiKey=secret" \
  -F "file=@cover.jpg"

# 3. 设置播客配置
curl -X PUT \
  "http://localhost:3100/api/v2/manage/podcasts/my-new-podcast/config?apiKey=secret" \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "title": "我的新播客",
      "description": "这是一个新播客",
      "author": "我",
      "language": "zh-cn"
    },
    "parsing": {
      "titleFormat": "clean",
      "episodeNumberStrategy": "prefix"
    }
  }'

# 4. 访问 RSS feed
# http://localhost:3100/feeds/my-new-podcast.xml
```

### 更新播客信息

```bash
# 只更新标题和描述
curl -X PATCH \
  "http://localhost:3100/api/v2/manage/podcasts/my-podcast/config/metadata?apiKey=secret" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "新标题",
    "description": "新描述"
  }'
```

### 管理文件

```bash
# 列出所有文件
curl "http://localhost:3100/api/v2/manage/podcasts/my-podcast/files?apiKey=secret"

# 重命名文件
curl -X PATCH \
  "http://localhost:3100/api/v2/manage/podcasts/my-podcast/files/old.mp3?apiKey=secret" \
  -H "Content-Type: application/json" \
  -d '{"newName": "new.mp3"}'

# 删除文件
curl -X DELETE \
  "http://localhost:3100/api/v2/manage/podcasts/my-podcast/files/unwanted.mp3?apiKey=secret"
```

## 与现有 API 的兼容性

Management API 是现有 API 的扩展，不会影响现有的只读 API：
- `GET /api/v2/podcasts` - V2 格式播客列表（只读）
- `GET /podcasts` - V1 兼容格式播客列表（只读）
- `GET /feeds/:dirName.xml` - RSS feed（只读）

Management API 提供的写操作都位于 `/api/v2/manage/` 路径下，完全独立。
