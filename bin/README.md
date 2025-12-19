# BBDown 二进制文件说明

本目录用于存放 BBDown 二进制文件，用于下载 B 站视频。

## 文件命名规则

请按照以下命名规则放置对应平台的 BBDown 二进制文件：

```
bin/
├── BBDown-darwin-arm64      # macOS Apple Silicon (M1/M2/M3)
├── BBDown-darwin-x64        # macOS Intel
├── BBDown-linux-arm64       # Linux ARM64
├── BBDown-linux-x64         # Linux x86_64
├── BBDown-win32-arm64.exe   # Windows ARM64
└── BBDown-win32-x64.exe     # Windows x86_64
```

## 命名格式

- **格式**: `BBDown-{platform}-{arch}[.exe]`
- **platform**:
  - `darwin` = macOS
  - `linux` = Linux
  - `win32` = Windows
- **arch**:
  - `arm64` = ARM64 架构
  - `x64` = x86_64 架构
- **扩展名**: Windows 平台需要添加 `.exe`

## 下载 BBDown

从 BBDown 官方 GitHub 仓库下载对应平台的二进制文件：

🔗 https://github.com/nilaoda/BBDown/releases

## 设置执行权限

在 macOS 和 Linux 系统上，下载后需要添加执行权限：

```bash
# macOS Apple Silicon
chmod +x bin/BBDown-darwin-arm64

# macOS Intel
chmod +x bin/BBDown-darwin-x64

# Linux
chmod +x bin/BBDown-linux-x64
chmod +x bin/BBDown-linux-arm64
```

## 验证

验证二进制文件是否可以正常运行：

```bash
# macOS (根据您的架构选择)
./bin/BBDown-darwin-arm64 --version

# Linux
./bin/BBDown-linux-x64 --version
```

## 注意事项

1. **不要提交到 Git**: 这些二进制文件已在 `.gitignore` 中配置忽略
2. **平台匹配**: 确保文件名与您的操作系统和架构匹配
3. **Docker 部署**: Docker 容器中通常使用 `BBDown-linux-x64`
4. **版本更新**: 定期检查并更新到最新版本的 BBDown
