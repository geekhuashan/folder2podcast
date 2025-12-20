# Folder2Podcast CI/CD 流程说明

本文档描述了 Folder2Podcast 项目的持续集成和持续部署 (CI/CD) 流程。

## GitHub Actions 工作流程

项目包含以下 GitHub Actions workflow：

### 1. docker-publish.yml - 主版本发布 (v1)

**触发条件**:
- Push 到 `main` 分支
- 创建版本标签（如 `v1.0.0`）
- 对 `main` 分支的 Pull Request

**生成的 Docker 镜像标签**:
- `yaotutu/folder2podcast:main` - main 分支最新版本
- `yaotutu/folder2podcast:v1.0.0` - 版本号标签
- `yaotutu/folder2podcast:latest` - 正式发布版本（仅限 tag）
- `yaotutu/folder2podcast:sha-xxxxxxx` - 提交 SHA 标签

**文件位置**: `.github/workflows/docker-publish.yml`

---

### 2. docker-publish-v2.yml - v2 版本发布 (NEW)

**触发条件**:
- Push 到 `dev-v2` 分支
- 手动触发 (workflow_dispatch)

**生成的 Docker 镜像标签**:
- `yaotutu/folder2podcast:dev-v2` - dev-v2 分支最新版本
- `yaotutu/folder2podcast:dev-v2-xxxxxxx` - 带提交 SHA 的版本
- `yaotutu/folder2podcast:latest-v2` - v2 最新版本

**文件位置**: `.github/workflows/docker-publish-v2.yml`

**特点**:
- ✅ 完全独立于 v1 的发布流程
- ✅ 不会影响 main 分支和已有的标签
- ✅ 支持多架构构建（amd64 和 arm64）
- ✅ 使用 GitHub Actions 缓存加速构建
- ✅ 可选的 Bark 推送通知

---

### 3. notify.yml - 仓库活动通知

**触发条件**:
- 新的 Issue 创建
- 仓库被 Star
- 仓库被 Fork

**功能**:
- 通过 Bark 发送推送通知（需要配置 `BARK_KEY` secret）

**文件位置**: `.github/workflows/notify.yml`

---

## Docker 镜像标签策略

### v1 版本（稳定版本）

| 标签 | 描述 | 更新时机 |
|------|------|----------|
| `latest` | 最新稳定版本 | 发布新的版本标签时（如 v1.2.0） |
| `main` | main 分支最新代码 | 每次 push 到 main 分支 |
| `v1.2.0` | 具体版本号 | 创建版本标签时 |
| `v1.2` | 次版本号 | 创建版本标签时 |
| `v1` | 主版本号 | 创建版本标签时 |

### v2 版本（开发版本）

| 标签 | 描述 | 更新时机 |
|------|------|----------|
| `latest-v2` | v2 最新版本 | 每次 push 到 dev-v2 分支 |
| `dev-v2` | dev-v2 分支最新代码 | 每次 push 到 dev-v2 分支 |
| `dev-v2-xxxxxxx` | 特定提交版本 | 每次 push 到 dev-v2 分支 |

**未来计划**: 当 v2 稳定后，可能会：
1. 合并 dev-v2 到 main
2. 发布 `v2.0.0` 标签
3. 更新 `latest` 指向 v2

---

## 使用 Docker 镜像

### 拉取 v1 稳定版本

```bash
# 最新稳定版本
docker pull yaotutu/folder2podcast:latest

# 特定版本
docker pull yaotutu/folder2podcast:v1.2.0

# main 分支最新代码
docker pull yaotutu/folder2podcast:main
```

### 拉取 v2 开发版本

```bash
# v2 最新版本（推荐用于测试 v2 新特性）
docker pull yaotutu/folder2podcast:latest-v2

# dev-v2 分支最新代码
docker pull yaotutu/folder2podcast:dev-v2

# 特定提交版本
docker pull yaotutu/folder2podcast:dev-v2-a1b2c3d
```

### 运行容器

```bash
# 使用 v2 版本
docker run -d \
  --name folder2podcast-v2 \
  -p 3100:3100 \
  -v /path/to/audio:/podcasts \
  -e BASE_URL=http://localhost:3100 \
  yaotutu/folder2podcast:latest-v2

# 使用 v1 稳定版本
docker run -d \
  --name folder2podcast \
  -p 3100:3100 \
  -v /path/to/audio:/podcasts \
  yaotutu/folder2podcast:latest
```

---

## 配置 GitHub Secrets

为了使 CI/CD 正常工作，需要在 GitHub 仓库中配置以下 Secrets：

### 必需的 Secrets

1. **DOCKERHUB_USERNAME**
   - 你的 Docker Hub 用户名
   - 设置路径: Settings → Secrets and variables → Actions → New repository secret

2. **DOCKERHUB_TOKEN**
   - Docker Hub 访问令牌（不是密码！）
   - 获取方式:
     1. 登录 Docker Hub
     2. 进入 Account Settings → Security
     3. 创建新的 Access Token
     4. 复制 token 并保存到 GitHub Secrets

### 可选的 Secrets

3. **BARK_KEY** (可选)
   - Bark 推送通知的 key
   - 如果不配置，通知步骤会被跳过

---

## 多架构支持

所有工作流程都支持多架构构建：

- **linux/amd64** - x86_64 架构（Intel/AMD 处理器）
- **linux/arm64** - ARM64 架构（Apple Silicon、树莓派 4 等）

使用 QEMU 和 Docker Buildx 实现跨平台构建。

---

## 手动触发构建

### dev-v2 分支构建

可以通过 GitHub Actions 页面手动触发 dev-v2 的构建：

1. 进入 GitHub 仓库的 Actions 页面
2. 选择 "Docker Image CI/CD (v2)" workflow
3. 点击 "Run workflow"
4. 选择 `dev-v2` 分支
5. 点击 "Run workflow" 按钮

---

## 开发流程建议

### v2 版本开发流程

```
dev-v2 分支 (开发)
    ↓
每次 push 自动构建
    ↓
推送到 DockerHub (dev-v2, latest-v2)
    ↓
测试验证
    ↓
稳定后创建 PR → main
    ↓
发布 v2.0.0 标签
    ↓
更新 latest 标签
```

### v1 版本维护流程

```
修复 bug / 小改进
    ↓
PR → main 分支
    ↓
合并后自动构建 main 标签
    ↓
创建版本标签 (v1.x.x)
    ↓
自动构建并更新 latest
```

---

## 构建缓存优化

两个 workflow 都使用了 GitHub Actions 缓存：

```yaml
cache-from: type=gha
cache-to: type=gha,mode=max
```

**优点**:
- 加快构建速度（尤其是依赖安装阶段）
- 减少 GitHub Actions 的构建时间
- 降低 Docker Hub 的拉取次数

---

## 故障排查

### 构建失败

1. **检查 Secrets 配置**
   - 确认 `DOCKERHUB_USERNAME` 和 `DOCKERHUB_TOKEN` 正确配置
   - 确认 token 有推送镜像的权限

2. **查看构建日志**
   - 进入 Actions 页面
   - 点击失败的 workflow run
   - 查看详细的错误信息

3. **本地测试构建**
   ```bash
   # 测试本地构建
   docker build -t folder2podcast:test .

   # 测试多架构构建
   docker buildx build --platform linux/amd64,linux/arm64 -t folder2podcast:test .
   ```

### 镜像推送失败

1. **验证 Docker Hub 登录**
   ```bash
   docker login
   # 使用 DOCKERHUB_USERNAME 和 DOCKERHUB_TOKEN
   ```

2. **检查仓库权限**
   - 确认 Docker Hub 仓库存在
   - 确认有推送权限

3. **检查 tag 格式**
   - 确认 `IMAGE_NAME` 环境变量正确
   - 格式应为: `username/repository`

---

## 版本发布检查清单

### 发布 v2 开发版本

- [ ] 代码已推送到 `dev-v2` 分支
- [ ] GitHub Actions 构建成功
- [ ] Docker Hub 上出现新的 `dev-v2` 和 `latest-v2` 标签
- [ ] 本地测试拉取和运行新镜像
- [ ] 验证主要功能正常

### 发布 v2 稳定版本

- [ ] v2 功能已充分测试
- [ ] 创建 PR: `dev-v2` → `main`
- [ ] 代码审查通过
- [ ] 合并到 main
- [ ] 创建版本标签: `git tag v2.0.0 && git push --tags`
- [ ] 验证 Actions 自动构建
- [ ] 更新文档和 CHANGELOG
- [ ] 发布 GitHub Release

---

## 相关资源

- [Docker Hub - folder2podcast](https://hub.docker.com/r/yaotutu/folder2podcast)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Docker Buildx 文档](https://docs.docker.com/buildx/working-with-buildx/)
- [项目部署文档](./DOCKER.md)

---

## 更新日志

- **2024-12-20**: 添加 v2 专用的 CI/CD workflow (`docker-publish-v2.yml`)
- **初始版本**: 创建主版本的 Docker 发布流程
