# BBDown 二进制文件目录

此目录用于存放 BBDown 工具的可执行文件，以支持 B站视频下载功能。

## 文件命名规则

BBDown 二进制文件需要按照以下规则命名（项目会自动检测平台并选择对应的文件）：

### Docker 环境（仅需 Linux 版本）

- **Linux x64**: `BBDown-linux-x64`
- **Linux ARM64**: `BBDown-linux-arm64`

### 本地开发环境

- **macOS (Apple Silicon)**: `BBDown-darwin-arm64`
- **macOS (Intel)**: `BBDown-darwin-x64`
- **Windows x64**: `BBDown-win32-x64.exe`

## 如何获取 BBDown

1. 访问 BBDown 官方仓库：https://github.com/nilaoda/BBDown
2. 在 Releases 页面下载对应平台的二进制文件
3. 将下载的文件重命名为上述格式
4. 复制到此目录
5. 确保文件具有可执行权限（Mac/Linux）

## 安装示例

### macOS (Apple Silicon)
```bash
# 下载 BBDown（假设已下载到 ~/Downloads）
cp ~/Downloads/BBDown_osx-arm64 bin/BBDown-darwin-arm64
chmod +x bin/BBDown-darwin-arm64
```

### Linux x64
```bash
# 下载 BBDown
cp ~/Downloads/BBDown_linux-x64 bin/BBDown-linux-x64
chmod +x bin/BBDown-linux-x64
```

## Docker 部署注意事项

1. **本地构建镜像时**: 将 Linux 版本的 BBDown 放在此目录，构建时会自动包含
2. **只需要 Linux 版本**: Docker 容器运行在 Linux 上，只需要 `BBDown-linux-x64` 和 `BBDown-linux-arm64`
3. **FFmpeg 已包含**: Dockerfile 已自动安装 FFmpeg

## 注意事项

1. BBDown 文件较大（约 30-50MB），已在 `.gitignore` 中排除
2. 如果不需要 B站视频下载功能，可以不配置 BBDown
3. 确保文件具有可执行权限（`chmod +x`）

更多信息请参考项目文档 `CLAUDE.md` 和 `DOCKER.md`。
