# S3 对象存储配置指南

Folder2Podcast 现已支持 S3 对象存储，可将音频文件、封面图片等静态资源存储到云端，支持七牛云、阿里云 OSS、腾讯云 COS、AWS S3、MinIO 等所有 S3 兼容服务。

---

## 📋 目录

- [功能特性](#功能特性)
- [快速开始](#快速开始)
- [配置说明](#配置说明)
- [七牛云配置示例](#七牛云配置示例)
- [阿里云 OSS 配置示例](#阿里云-oss-配置示例)
- [MinIO 配置示例](#minio-配置示例)
- [常见问题](#常见问题)

---

## 功能特性

- ✅ **统一存储抽象**：本地存储和 S3 存储使用相同的 API，切换无缝
- ✅ **多云支持**：兼容所有 S3 API 的对象存储服务
- ✅ **零迁移成本**：本地数据和 S3 数据独立，无需迁移
- ✅ **完整功能**：支持文件上传、删除、重命名、封面管理等所有功能
- ✅ **智能 URL 生成**：自动生成正确的文件访问链接
- ✅ **CDN 支持**：可配置自定义域名和 CDN 加速

---

## 快速开始

### 1. 安装依赖

依赖已自动安装，无需额外操作。

### 2. 配置环境变量

编辑 `.env` 文件（如不存在，从 `.env.example` 复制）：

```bash
# 切换到 S3 存储模式
STORAGE_MODE=s3

# S3 基础配置
S3_ENDPOINT=https://s3-cn-east-1.qiniucs.com
S3_REGION=cn-east-1
S3_BUCKET=my-podcast-bucket
S3_ACCESS_KEY_ID=your-access-key-id
S3_SECRET_ACCESS_KEY=your-secret-access-key

# S3 公开访问 URL（可选，用于自定义域名）
S3_PUBLIC_URL=https://cdn.yourdomain.com

# Bucket 路径前缀（可选）
S3_BUCKET_PREFIX=folder2podcast
```

### 3. 重启服务

```bash
npm run build
npm start
```

---

## 配置说明

### 必需配置

| 环境变量 | 说明 | 示例 |
|---------|------|------|
| `STORAGE_MODE` | 存储模式（local/s3） | `s3` |
| `S3_ENDPOINT` | S3 端点地址 | `https://s3-cn-east-1.qiniucs.com` |
| `S3_BUCKET` | Bucket 名称 | `my-podcast-bucket` |
| `S3_ACCESS_KEY_ID` | 访问密钥 ID | `your-access-key-id` |
| `S3_SECRET_ACCESS_KEY` | 访问密钥 | `your-secret-access-key` |

### 可选配置

| 环境变量 | 说明 | 默认值 |
|---------|------|--------|
| `S3_REGION` | S3 区域 | `us-east-1` |
| `S3_PUBLIC_URL` | 公开访问 URL | 使用 `S3_ENDPOINT` |
| `S3_BUCKET_PREFIX` | Bucket 内路径前缀 | 无 |

---

## 七牛云配置示例

### 1. 创建 Bucket

1. 登录 [七牛云控制台](https://portal.qiniu.com/)
2. 进入「对象存储」→「空间管理」
3. 点击「新建空间」，选择公开空间

### 2. 获取配置信息

- **Bucket 名称**：创建时设置的空间名称
- **端点地址**：根据区域选择
  - 华东: `https://s3-cn-east-1.qiniucs.com`
  - 华南: `https://s3-cn-south-1.qiniucs.com`
  - 华北: `https://s3-cn-north-1.qiniucs.com`
- **Access Key / Secret Key**：「个人中心」→「密钥管理」

### 3. 配置 .env

```bash
STORAGE_MODE=s3
S3_ENDPOINT=https://s3-cn-east-1.qiniucs.com
S3_REGION=cn-east-1
S3_BUCKET=my-podcast-bucket
S3_ACCESS_KEY_ID=your_qiniu_access_key
S3_SECRET_ACCESS_KEY=your_qiniu_secret_key

# 如果绑定了自定义域名
S3_PUBLIC_URL=https://cdn.yourdomain.com
```

### 4. 自定义域名（可选）

1. 在七牛云空间设置中绑定自定义域名
2. 配置 `S3_PUBLIC_URL` 为自定义域名
3. RSS Feed 和 Web 页面将使用自定义域名访问文件

---

## 阿里云 OSS 配置示例

### 1. 创建 Bucket

1. 登录 [阿里云 OSS 控制台](https://oss.console.aliyun.com/)
2. 点击「创建 Bucket」，选择「公共读」权限

### 2. 获取配置信息

- **端点地址**：根据区域选择
  - 杭州: `https://oss-cn-hangzhou.aliyuncs.com`
  - 上海: `https://oss-cn-shanghai.aliyuncs.com`
  - 北京: `https://oss-cn-beijing.aliyuncs.com`
- **Access Key ID / Secret**：「AccessKey 管理」

### 3. 配置 .env

```bash
STORAGE_MODE=s3
S3_ENDPOINT=https://oss-cn-hangzhou.aliyuncs.com
S3_REGION=cn-hangzhou
S3_BUCKET=my-podcast-bucket
S3_ACCESS_KEY_ID=your_aliyun_access_key_id
S3_SECRET_ACCESS_KEY=your_aliyun_access_key_secret
S3_PUBLIC_URL=https://your-bucket.oss-cn-hangzhou.aliyuncs.com
```

---

## MinIO 配置示例

### 1. 部署 MinIO

使用 Docker 快速部署：

```bash
docker run -d \
  -p 9000:9000 \
  -p 9001:9001 \
  --name minio \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  -v /data/minio:/data \
  minio/minio server /data --console-address ":9001"
```

### 2. 创建 Bucket

1. 访问 `http://localhost:9001`
2. 使用 `minioadmin` / `minioadmin` 登录
3. 创建 Bucket 并设置为 Public

### 3. 配置 .env

```bash
STORAGE_MODE=s3
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=podcasts
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_PUBLIC_URL=http://localhost:9000
```

---

## 常见问题

### 1. 切换存储模式后原有数据怎么办？

本地数据和 S3 数据是**完全独立**的，切换存储模式不会影响原有数据。如果需要迁移，可以：

- 手动将文件上传到 S3
- 使用对象存储服务商提供的同步工具
- 编写脚本批量迁移（未来可能提供）

### 2. 如何验证 S3 配置是否正确？

启动服务时会在控制台输出存储模式：

```
[StorageFactory] 初始化存储模式: s3
```

如果配置错误，会抛出详细的错误信息。

### 3. S3 模式下文件上传失败怎么办？

检查以下几点：

1. **Bucket 权限**：确保 Bucket 设置为公开读或配置了正确的访问策略
2. **访问密钥**：确认 Access Key 和 Secret Key 正确
3. **网络连接**：确保服务器可以访问 S3 端点
4. **跨域配置**：如果使用 Web 界面上传，可能需要配置 CORS

### 4. URL 生成不正确怎么办？

确保配置了 `S3_PUBLIC_URL`：

- **未配置**：默认使用 `S3_ENDPOINT`
- **自定义域名**：配置为绑定的域名
- **CDN 加速**：配置为 CDN 域名

### 5. 支持私有 Bucket 吗？

当前版本仅支持公开 Bucket。未来版本计划支持：

- 预签名 URL（临时访问链接）
- 私有 Bucket + 代理下载

### 6. 如何降低 S3 API 调用成本？

- 减少文件扫描频率（未来计划添加缓存机制）
- 使用 Bucket 前缀隔离数据，避免列出大量对象
- 启用 CDN 加速，减少直接访问 S3 的次数

---

## 技术实现

### 架构设计

```
┌─────────────────┐
│  IStorage 接口  │  统一存储抽象
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼───┐
│Local │  │  S3  │  两种实现
│Storage│  │Storage│
└──────┘  └──────┘
```

### 关键代码

- **存储接口**：`src/services/storage/storage.interface.ts`
- **本地存储**：`src/services/storage/local.storage.ts`
- **S3 存储**：`src/services/storage/s3.storage.ts`
- **存储工厂**：`src/services/storage/storage.factory.ts`
- **文件管理**：`src/services/file-management.service.ts`

---

## 贡献

如果您在使用过程中遇到问题或有改进建议，欢迎提交 Issue 或 PR！
