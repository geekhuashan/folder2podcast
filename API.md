# Folder2Podcast Next.js - API 文档

## 快速开始

### 1. 启动项目

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

### 2. 获取 Access Key

**方法一：通过用户名/密码登录**

```bash
curl -X POST http://localhost:3100/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your_password"
  }'
```

响应示例：
```json
{
  "success": true,
  "data": {
    "userId": "admin",
    "username": "admin",
    "accessKey": "fp_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
  }
}
```

**方法二：通过注册（开放注册模式）**

```bash
curl -X POST http://localhost:3100/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "password": "newpassword"
  }'
```

**重要：请妥善保管 Access Key，它相当于您的 API 密钥！**

---

## HTTP API 接口

所有 API 都遵循 [JSend](https://github.com/omniti-labs/jsend) 规范。

### 认证

除了 RSS Feed 路由外，所有 API 都需要在请求头中携带 Access Key：

```bash
Authorization: Bearer fp_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

---

## 播客管理 API

### 1. 获取播客列表

```bash
GET /api/v1/podcasts
```

**请求示例：**
```bash
curl -H "Authorization: Bearer fp_xxx" \
     http://localhost:3100/api/v1/podcasts
```

**响应示例：**
```json
{
  "status": "success",
  "data": [
    {
      "id": "podcast-uuid",
      "title": "我的播客",
      "description": "播客描述",
      "author": "作者",
      "feedUrl": "http://localhost:3100/feed/podcast-uuid",
      ...
    }
  ]
}
```

---

### 2. 创建播客

```bash
POST /api/v1/podcasts
Content-Type: application/json
```

**请求体：**
```json
{
  "dirName": "my-podcast",
  "title": "我的播客",
  "description": "这是我的播客",
  "author": "张三",
  "email": "zhangsan@example.com",
  "category": "Technology",
  "explicit": false
}
```

**请求示例：**
```bash
curl -X POST \
     -H "Authorization: Bearer fp_xxx" \
     -H "Content-Type: application/json" \
     -d '{
       "dirName": "my-podcast",
       "title": "我的播客",
       "description": "这是我的播客",
       "author": "张三"
     }' \
     http://localhost:3100/api/v1/podcasts
```

**响应示例：**
```json
{
  "status": "success",
  "data": {
    "id": "podcast-uuid",
    "dirName": "my-podcast",
    "title": "我的播客",
    "feedUrl": "http://localhost:3100/feed/podcast-uuid",
    ...
  }
}
```

---

### 3. 获取播客详情

```bash
GET /api/v1/podcasts/{id}
```

**请求示例：**
```bash
curl -H "Authorization: Bearer fp_xxx" \
     http://localhost:3100/api/v1/podcasts/podcast-uuid
```

---

### 4. 更新播客元数据

```bash
PUT /api/v1/podcasts/{id}
Content-Type: application/json
```

**请求体：**
```json
{
  "title": "更新后的标题",
  "description": "更新后的描述",
  "author": "新作者"
}
```

**请求示例：**
```bash
curl -X PUT \
     -H "Authorization: Bearer fp_xxx" \
     -H "Content-Type: application/json" \
     -d '{"title": "更新后的标题"}' \
     http://localhost:3100/api/v1/podcasts/podcast-uuid
```

---

### 5. 删除播客

```bash
DELETE /api/v1/podcasts/{id}?deleteFiles=true
```

**查询参数：**
- `deleteFiles`: 是否删除文件（true/false，默认 false）

**请求示例：**
```bash
# 仅删除数据库记录
curl -X DELETE \
     -H "Authorization: Bearer fp_xxx" \
     http://localhost:3100/api/v1/podcasts/podcast-uuid

# 同时删除文件
curl -X DELETE \
     -H "Authorization: Bearer fp_xxx" \
     http://localhost:3100/api/v1/podcasts/podcast-uuid?deleteFiles=true
```

---

## 剧集管理 API

### 6. 获取剧集列表

```bash
GET /api/v1/podcasts/{id}/episodes
```

**请求示例：**
```bash
curl -H "Authorization: Bearer fp_xxx" \
     http://localhost:3100/api/v1/podcasts/podcast-uuid/episodes
```

**响应示例：**
```json
{
  "status": "success",
  "data": {
    "episodes": [
      {
        "id": "episode-uuid",
        "title": "第一集",
        "audioUrl": "http://localhost:3100/audio/user-id/my-podcast/episode01.mp3",
        "imageUrl": "http://localhost:3100/audio/user-id/my-podcast/cover.jpg",
        "duration": 180,
        "fileSize": 5242880,
        "pubDate": "2024-01-01T00:00:00.000Z",
        ...
      }
    ],
    "total": 1
  }
}
```

---

## 文件上传 API

### 7. 上传音频文件

```bash
POST /api/v1/upload
Content-Type: multipart/form-data
```

**表单字段：**
- `file`: 音频文件（必填）
- `podcastId`: 播客 ID（必填）

**请求示例：**
```bash
curl -X POST \
     -H "Authorization: Bearer fp_xxx" \
     -F "file=@episode01.mp3" \
     -F "podcastId=podcast-uuid" \
     http://localhost:3100/api/v1/upload
```

**响应示例：**
```json
{
  "status": "success",
  "data": {
    "fileName": "episode01.mp3",
    "fileSize": 5242880,
    "message": "File uploaded successfully"
  }
}
```

---

## RSS Feed

### 8. 获取 RSS Feed

```bash
GET /feed/{podcastId}
```

**请求示例：**
```bash
curl http://localhost:3100/feed/podcast-uuid
```

**响应：**
返回符合 RSS 2.0 + iTunes 扩展的 XML 格式。

**在播客客户端中订阅：**
```
http://localhost:3100/feed/podcast-uuid
```

---

## 使用流程示例

### 完整示例：创建播客并上传音频

```bash
# 1. 登录获取 Access Key（只需执行一次）
curl -X POST http://localhost:3100/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your_password"
  }'
# 保存返回的 Access Key

# 2. 设置 Access Key
export ACCESS_KEY="fp_xxx"

# 3. 创建播客
curl -X POST \
     -H "Authorization: Bearer $ACCESS_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "dirName": "tech-podcast",
       "title": "技术播客",
       "description": "分享技术知识",
       "author": "技术博主"
     }' \
     http://localhost:3100/api/v1/podcasts
# 保存返回的 podcast ID

# 4. 上传音频文件
curl -X POST \
     -H "Authorization: Bearer $ACCESS_KEY" \
     -F "file=@episode01.mp3" \
     -F "podcastId=podcast-uuid" \
     http://localhost:3100/api/v1/upload

# 5. 在播客客户端中订阅
# 使用 URL: http://localhost:3100/feed/podcast-uuid
```

---

## 错误处理

所有错误响应遵循 JSend 规范：

### 客户端错误（验证失败）
```json
{
  "status": "fail",
  "data": {
    "title": "Title is required"
  }
}
```

### 服务器错误
```json
{
  "status": "error",
  "message": "Internal server error",
  "code": 500
}
```

---

## 外部下载器集成示例

B站/抖音下载器作为独立项目，通过标准 HTTP API 与主程序联动：

```python
# bilibili-downloader/main.py
import requests

# 1. 下载视频并提取音频
audio_file = download_bilibili_video("BV1234567890")

# 2. 上传到播客
with open(audio_file, 'rb') as f:
    response = requests.post(
        'http://localhost:3100/api/v1/upload',
        headers={'Authorization': 'Bearer fp_xxx'},
        files={'file': f},
        data={'podcastId': 'podcast-uuid'}
    )

# 3. 处理响应
result = response.json()
if result['status'] == 'success':
    print(f"上传成功：{result['data']['fileName']}")
```

---

## 环境变量配置

创建 `.env.local` 文件：

```env
# 数据库
DATABASE_URL=./data/podcasts.db

# 服务器
BASE_URL=http://localhost:3100
PORT=3000
```

---

## 数据库管理

```bash
# 生成迁移文件
npm run db:generate

# 运行迁移
npm run db:migrate

# 打开数据库管理界面
npm run db:studio
```
