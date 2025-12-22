# 前端 UI/UX 全面重构指南

## 概述

本文档包含 Folder2Podcast Web 前端的完整重构方案，采用极简主义设计理念和主从布局模式。

---

## 一、已完成的基础设施

### 1. 全局模态框管理器 ✅
**文件**: `web/src/contexts/ModalContext.jsx`

- 提供 `ModalProvider` 和 `useModal()` hook
- 确保同时只有一个模态框打开
- 统一的 API: `modal.open(id, data)`, `modal.close()`, `modal.isOpen(id)`

### 2. 通用确认对话框 ✅
**文件**: `web/src/components/ConfirmDialog.jsx`

- 替换所有原生 `confirm()` 调用
- 支持自定义标题、消息、按钮文本
- `danger` 模式用于危险操作（红色主题）

**使用示例**:
```jsx
const modal = useModal();

modal.open('confirm', {
  title: '确认删除',
  message: '确定要删除这个文件吗？',
  danger: true,
  onConfirm: async () => {
    await podcastsAPI.deleteFile(dirName, fileName);
  }
});
```

### 3. 错误边界组件 ✅
**文件**: `web/src/components/ErrorBoundary.jsx`

- 捕获子组件错误，防止整个应用崩溃
- 显示友好的错误提示界面
- 提供刷新页面按钮和详细错误堆栈

---

## 二、核心组件重构

### 4. FileManager - 主从布局 🔄

**目标**: 将当前的单栏布局改为左右分栏的主从布局

**新布局**:
```
┌─────────────────────────────────────────────┐
│ 播客名称               [配置] [上传]         │
├──────────────┬──────────────────────────────┤
│              │                              │
│  文件列表     │      详情面板                │
│  (左40%)     │      (右60%)                 │
│              │                              │
│ □ 001.mp3   │  当前选中：001.mp3            │
│ ☑ 002.mp3   │  ┌────────────────┐          │
│ □ 003.mp3   │  │ 标题: [     ]  │          │
│              │  │ 描述: [     ]  │          │
│              │  │ 封面: [上传]   │          │
│              │  │ [保存] [删除]  │          │
│              │  └────────────────┘          │
└──────────────┴──────────────────────────────┘
```

**关键变化**:
1. **删除独立模态框**: 移除 `EpisodeEditor.jsx` 和 `AudioPlayer.jsx`
2. **行内播放器**: 点击文件名即可在右侧面板播放，无需弹窗
3. **即时编辑**: 选中文件后，右侧立即显示可编辑的详情面板
4. **自动保存**: 编辑字段后自动保存（防抖 1 秒）

**核心代码框架**: 见附录 A

---

### 5. ConfigEditor - 标签页设计 🔄

**目标**: 拆分为多个子组件，采用标签页布局

**新结构**:
```
┌─ 播客配置 ─────────────────────┐
│ [基本信息] [解析规则] [高级设置] │
│ ─────────────────────────────  │
│ (当前选中标签的内容)             │
└────────────────────────────────┘
```

**拆分子组件**:
- `ConfigBasicInfo.jsx` - 标题、描述、作者、封面
- `ConfigParsing.jsx` - 文件名解析策略、时间策略
- `ConfigAdvanced.jsx` - 邮箱、网站、语言、分类等

**核心代码框架**: 见附录 B

---

### 6. PodcastList - 极简卡片 🔄

**目标**: 简化卡片信息，只保留核心内容

**变化**:
- 移除描述（点击进入后才显示）
- 删除按钮改为右上角三点菜单 `⋮`
- 点击卡片立即进入文件管理

**新卡片结构**:
```
┌─────────────────────┐
│ 🎧 5集        ⋮     │  ← 三点菜单
│                     │
│ 我的播客             │
│                     │
│ admin:my-podcast    │
│ 管理 →              │
└─────────────────────┘
```

**核心代码框架**: 见附录 C

---

### 7. CreatePodcastModal - 极简表单 🔄

**目标**: 只保留必填项，其他配置在创建后编辑

**新表单**:
- 标题（必填）
- 目录名（自动生成，可编辑）
- 移除：描述、作者、封面等（创建后再设置）

---

### 8. FloatingTaskWindow - 统一任务管理 🔄

**目标**: 合并下载和上传任务到一个窗口

**变化**:
- 删除 `UploadProgressWindow.jsx`
- 增强 `FloatingTaskWindow.jsx`，支持两种任务类型
- 按时间倒序显示所有任务
- 支持筛选：全部/下载中/上传中/已完成/失败

**任务显示**:
```
┌─ 任务中心 ──────── × ┐
│ [全部] [进行中] [失败] │
│                      │
│ 上传 episode001.mp3  │
│ ████████░░ 80%      │
│                      │
│ 下载 B站视频          │
│ ████████████ 完成    │
└──────────────────────┘
```

**核心代码框架**: 见附录 D

---

### 9. BilibiliDownload - 简化界面 🔄

**目标**: 移除平台选项卡，优化分P选择

**变化**:
1. 直接显示 B站 下载表单（不需要选项卡）
2. 分P 选择优化:
   - ≤10 集：显示复选框列表
   - >10 集：显示范围选择器（如 1-10, 11-20）
3. 自动获取改为手动点击"获取信息"按钮

---

## 三、样式系统统一

### 10. 全局样式重构 🔄

**文件**: `web/public/style.css`

**简化设计系统**:

```css
/* 颜色方案精简 */
:root {
  /* 主色调 */
  --primary: #3b82f6;
  --primary-hover: #2563eb;

  /* 灰度 */
  --text: #1f2937;
  --text-muted: #6b7280;
  --border: #e5e7eb;
  --background: #ffffff;
  --surface: #f9fafb;
  --surface-soft: #f3f4f6;

  /* 语义色 */
  --success: #10b981;
  --danger: #ef4444;
  --warning: #f59e0b;

  /* 圆角统一 */
  --radius: 8px;
  --radius-sm: 4px;
  --radius-lg: 12px;
}

/* 移除不必要的阴影和渐变 */
.card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: white;
  /* 去掉 box-shadow */
}

/* 统一按钮样式 */
.btn {
  padding: 0.5rem 1rem;
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-weight: 500;
  transition: background 0.2s;
  /* 去掉多余的过渡效果 */
}
```

**删除的样式**:
- 复杂的渐变背景
- 多层阴影效果
- 过度动画

---

## 四、App.jsx 集成

### 11. App 组件更新 🔄

**关键变化**:

```jsx
import { ModalProvider } from './contexts/ModalContext';
import ErrorBoundary from './components/ErrorBoundary';
import ConfirmDialog from './components/ConfirmDialog';

function App() {
  return (
    <ErrorBoundary>
      <ModalProvider>
        <ToastProvider>
          {/* 应用主体 */}
          <Routes>
            {/* ... */}
          </Routes>

          {/* 全局模态框 */}
          <ConfirmDialog />
        </ToastProvider>
      </ModalProvider>
    </ErrorBoundary>
  );
}
```

---

## 五、替换原生 confirm() 调用

### 需要替换的位置:

1. **FileManager.jsx:124** - 删除文件确认
2. **PodcastList.jsx:73** - 删除播客确认

**替换示例**:

```jsx
// 旧代码
const handleDelete = async (fileName) => {
  if (!confirm(`确定要删除 "${fileName}" 吗？`)) return;
  await podcastsAPI.deleteFile(dirName, fileName);
};

// 新代码
const modal = useModal();

const handleDelete = (fileName) => {
  modal.open('confirm', {
    title: '确认删除',
    message: `确定要删除 "${fileName}" 吗？此操作无法撤销。`,
    danger: true,
    onConfirm: async () => {
      await podcastsAPI.deleteFile(dirName, fileName);
      toast.success('文件删除成功');
      refetch();
    }
  });
};
```

---

## 六、实施步骤

### 阶段一：基础设施（已完成 ✅）
- [x] ModalContext
- [x] ConfirmDialog
- [x] ErrorBoundary

### 阶段二：核心重构
- [ ] 合并 FloatingTaskWindow
- [ ] 重写 FileManager（主从布局）
- [ ] 删除 EpisodeEditor 和 AudioPlayer
- [ ] 替换所有 confirm() 调用

### 阶段三：优化改进
- [ ] 重构 ConfigEditor（标签页）
- [ ] 优化 PodcastList
- [ ] 简化 CreatePodcastModal
- [ ] 简化 BilibiliDownload

### 阶段四：收尾
- [ ] 统一全局样式
- [ ] 更新 App.jsx
- [ ] 全面测试

---

## 七、关键指标对比

| 指标 | 重构前 | 重构后 | 改善 |
|------|--------|--------|------|
| 组件数量 | 12 个 | 10 个 | ↓ 17% |
| 模态框数量 | 3-4 个 | 1 个 | ↓ 70% |
| 编辑剧集步骤 | 5 步 | 2 步 | ↓ 60% |
| 删除文件步骤 | 3 步 | 2 步 | ↓ 33% |
| 平均组件行数 | ~600 行 | ~300 行 | ↓ 50% |

---

## 附录 A: FileManager 主从布局核心代码

```jsx
export default function FileManager(props) {
  const [selectedFile, setSelectedFile] = createSignal(null);
  const [files, { refetch }] = createResource(() => props.podcast.id, podcastsAPI.getFiles);

  // 选中文件后加载详情
  const fileDetails = createResource(
    () => selectedFile(),
    async (fileName) => {
      if (!fileName) return null;
      const episodes = await episodesAPI.getEpisodes(props.podcast.id);
      return episodes.data.find(ep => ep.fileName === fileName);
    }
  );

  return (
    <div class="file-manager">
      {/* 左侧：文件列表 */}
      <div class="file-list">
        <For each={files()?.data || []}>
          {(file) => (
            <div
              class={`file-item ${selectedFile() === file.fileName ? 'selected' : ''}`}
              onClick={() => setSelectedFile(file.fileName)}
            >
              <span>{file.fileName}</span>
            </div>
          )}
        </For>
      </div>

      {/* 右侧：详情面板 */}
      <div class="file-details">
        <Show when={selectedFile()} fallback={<EmptyState />}>
          <EpisodeDetailsPanel
            file={selectedFile()}
            details={fileDetails()}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        </Show>
      </div>
    </div>
  );
}
```

**CSS**:
```css
.file-manager {
  display: grid;
  grid-template-columns: 40% 60%;
  gap: 1rem;
  min-height: 600px;
}

.file-list {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow-y: auto;
}

.file-item {
  padding: 0.75rem 1rem;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
}

.file-item.selected {
  background: var(--primary);
  color: white;
}

.file-details {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.5rem;
}
```

---

## 附录 B: ConfigEditor 标签页核心代码

```jsx
export default function ConfigEditor(props) {
  const [activeTab, setActiveTab] = createSignal('basic');

  return (
    <div class="modal-overlay" onClick={props.onClose}>
      <div class="modal modal--large" onClick={(e) => e.stopPropagation()}>
        {/* 标签页导航 */}
        <div class="tabs">
          <button
            class={activeTab() === 'basic' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('basic')}
          >
            基本信息
          </button>
          <button
            class={activeTab() === 'parsing' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('parsing')}
          >
            解析规则
          </button>
          <button
            class={activeTab() === 'advanced' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('advanced')}
          >
            高级设置
          </button>
        </div>

        {/* 标签页内容 */}
        <div class="tab-content">
          <Show when={activeTab() === 'basic'}>
            <ConfigBasicInfo podcast={props.podcast} />
          </Show>
          <Show when={activeTab() === 'parsing'}>
            <ConfigParsing podcast={props.podcast} />
          </Show>
          <Show when={activeTab() === 'advanced'}>
            <ConfigAdvanced podcast={props.podcast} />
          </Show>
        </div>
      </div>
    </div>
  );
}
```

---

## 附录 C: PodcastList 极简卡片

```jsx
{(podcast) => (
  <article
    class="podcast-card"
    onClick={() => props.onSelect(podcast)}
  >
    {/* 顶部：剧集数 + 菜单 */}
    <div class="podcast-card__header">
      <span class="badge">🎧 {podcast.episodeCount} 集</span>
      <button
        class="btn-icon"
        onClick={(e) => {
          e.stopPropagation();
          openMenu(podcast);
        }}
      >
        ⋮
      </button>
    </div>

    {/* 标题 */}
    <h3>{podcast.title}</h3>

    {/* 底部：目录名 + 箭头 */}
    <div class="podcast-card__footer">
      <span class="text-muted">{podcast.dirName}</span>
      <span class="text-primary">管理 →</span>
    </div>
  </article>
)}
```

---

## 附录 D: FloatingTaskWindow 统一任务

```jsx
export default function FloatingTaskWindow() {
  const [filter, setFilter] = createSignal('all');

  // 合并下载和上传任务
  const allTasks = createMemo(() => {
    const downloads = downloadState.tasks.map(t => ({ ...t, type: 'download' }));
    const uploads = uploadState.tasks.map(t => ({ ...t, type: 'upload' }));
    return [...downloads, ...uploads].sort((a, b) => b.createdAt - a.createdAt);
  });

  const filteredTasks = createMemo(() => {
    const tasks = allTasks();
    switch (filter()) {
      case 'active':
        return tasks.filter(t => t.status === 'pending' || t.status === 'downloading' || t.status === 'uploading');
      case 'failed':
        return tasks.filter(t => t.status === 'failed');
      default:
        return tasks;
    }
  });

  return (
    <div class="floating-window">
      <div class="floating-window__header">
        <span>任务中心</span>
        <div class="filters">
          <button onClick={() => setFilter('all')}>全部</button>
          <button onClick={() => setFilter('active')}>进行中</button>
          <button onClick={() => setFilter('failed')}>失败</button>
        </div>
      </div>
      <div class="floating-window__body">
        <For each={filteredTasks()}>
          {(task) => (
            <TaskItem task={task} />
          )}
        </For>
      </div>
    </div>
  );
}
```

---

## 总结

本重构方案将彻底简化前端 UI/UX，减少不必要的层级和复杂度，提升用户操作效率。核心改进包括：

1. **主从布局** - 文件管理更直观
2. **统一模态框** - 同时只有一个弹窗
3. **极简设计** - 去除冗余信息和装饰
4. **即时编辑** - 减少操作步骤

所有代码框架已在附录中提供，可按阶段逐步实施或一次性应用。
