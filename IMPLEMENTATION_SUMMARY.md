# 前端重构实施摘要

本文档提供了快速实施所有重构的关键信息和代码片段。

## 当前进度

✅ **已完成** (4/17):
1. ModalContext - `/web/src/contexts/ModalContext.jsx`
2. ConfirmDialog - `/web/src/components/ConfirmDialog.jsx`
3. ErrorBoundary - `/web/src/components/ErrorBoundary.jsx`
4. 重构指南文档 - `/REFACTOR_GUIDE.md`

## 快速实施路径

由于完整重构涉及大量代码（预计 5000+ 行），建议采用以下方式之一：

### 方案 A: 渐进式重构（推荐）

仅实施最关键的改动，保持功能可用：

#### 第一步：替换 confirm() 调用
**文件**: `FileManager.jsx`, `PodcastList.jsx`

在文件开头添加：
```jsx
import { useModal } from '../contexts/ModalContext';
```

将所有 `confirm()` 替换为：
```jsx
// 旧代码（删除）
if (!confirm(`确定要删除 "${fileName}" 吗？`)) return;

// 新代码
const modal = useModal();
modal.open('confirm', {
  title: '确认删除',
  message: `确定要删除 "${fileName}" 吗？`,
  danger: true,
  onConfirm: async () => {
    // 原有的删除逻辑
  }
});
```

#### 第二步：集成 ModalProvider 和 ErrorBoundary
**文件**: `App.jsx`

```jsx
import { ModalProvider } from './contexts/ModalContext';
import ErrorBoundary from './components/ErrorBoundary';
import ConfirmDialog from './components/ConfirmDialog';

// 在返回的 JSX 中包裹：
return (
  <ErrorBoundary>
    <ModalProvider>
      <ToastProvider>
        {/* 现有内容 */}

        {/* 在最后添加全局模态框 */}
        <ConfirmDialog />
      </ToastProvider>
    </ModalProvider>
  </ErrorBoundary>
);
```

#### 第三步：简化样式（可选）
**文件**: `web/public/style.css`

移除复杂的阴影和渐变，统一颜色变量（参考 REFACTOR_GUIDE.md 附录）

---

### 方案 B: 完整重构

如果您希望完整实施所有改动，以下是需要修改/创建的所有文件清单：

## 文件清单

### 需要完全重写的文件 (7个)

1. **FloatingTaskWindow.jsx** - 合并下载/上传任务
2. **FileManager.jsx** - 主从布局
3. **ConfigEditor.jsx** - 标签页设计
4. **PodcastList.jsx** - 极简卡片
5. **CreatePodcastModal.jsx** - 简化表单
6. **BilibiliDownload.jsx** - 移除平台选项卡
7. **style.css** - 简化设计系统

### 需要创建的新文件 (5个)

8. **EpisodeDetailsPanel.jsx** - 文件详情面板（FileManager 右侧）
9. **InlineAudioPlayer.jsx** - 行内音频播放器
10. **ConfigBasicInfo.jsx** - 配置：基本信息标签页
11. **ConfigParsing.jsx** - 配置：解析规则标签页
12. **ConfigAdvanced.jsx** - 配置：高级设置标签页

### 需要删除的文件 (2个)

13. **AudioPlayer.jsx** - 删除（功能整合到 InlineAudioPlayer）
14. **EpisodeEditor.jsx** - 删除（功能整合到 EpisodeDetailsPanel）
15. **UploadProgressWindow.jsx** - 删除（功能整合到 FloatingTaskWindow）

### 需要修改的文件 (1个)

16. **App.jsx** - 集成新组件

---

## 关键代码片段

### 1. 统一任务中心（FloatingTaskWindow.jsx）

合并下载和上传任务的核心逻辑：

```jsx
import { taskManager } from '../utils/taskManager'; // 下载任务
import { uploadState } from '../utils/uploadManager'; // 上传任务
import { createMemo } from 'solid-js';

export default function FloatingTaskWindow() {
  // 合并两种任务
  const allTasks = createMemo(() => {
    const downloads = taskManager.getAllTasks().map(t => ({
      ...t,
      type: 'download',
      displayName: t.episodeTitle || t.url
    }));

    const uploads = uploadState.tasks.map(t => ({
      ...t,
      type: 'upload',
      status: t.status, // uploading/completed/failed
      displayName: t.fileName,
      percent: t.progress
    }));

    return [...downloads, ...uploads]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  });

  return (
    <div class="floating-window">
      {/* 任务列表 */}
      <For each={allTasks()}>
        {(task) => (
          <div class="task-item">
            <span>{task.type === 'download' ? '⬇️' : '⬆️'} {task.displayName}</span>
            <progress value={task.percent || 0} max="100" />
            <span>{task.percent?.toFixed(0)}%</span>
          </div>
        )}
      </For>
    </div>
  );
}
```

### 2. FileManager 主从布局核心

```jsx
export default function FileManager(props) {
  const [selectedFile, setSelectedFile] = createSignal(null);

  return (
    <div style={{
      display: 'grid',
      'grid-template-columns': '40% 60%',
      gap: '1rem',
      'min-height': '600px'
    }}>
      {/* 左侧：文件列表 */}
      <div class="file-list">
        <For each={files()?.data || []}>
          {(file) => (
            <div
              class={selectedFile() === file.fileName ? 'selected' : ''}
              onClick={() => setSelectedFile(file.fileName)}
            >
              {file.fileName}
            </div>
          )}
        </For>
      </div>

      {/* 右侧：详情面板 */}
      <div class="file-details">
        <Show when={selectedFile()}>
          <EpisodeDetailsPanel
            fileName={selectedFile()}
            podcastId={props.podcast.id}
          />
        </Show>
      </div>
    </div>
  );
}
```

### 3. ConfigEditor 标签页

```jsx
export default function ConfigEditor(props) {
  const [activeTab, setActiveTab] = createSignal('basic');

  return (
    <div class="modal-overlay">
      <div class="modal modal--large">
        <div class="tabs">
          <button
            class={activeTab() === 'basic' ? 'active' : ''}
            onClick={() => setActiveTab('basic')}
          >
            基本信息
          </button>
          <button
            class={activeTab() === 'parsing' ? 'active' : ''}
            onClick={() => setActiveTab('parsing')}
          >
            解析规则
          </button>
        </div>

        <Show when={activeTab() === 'basic'}>
          <ConfigBasicInfo podcast={props.podcast} />
        </Show>
        <Show when={activeTab() === 'parsing'}>
          <ConfigParsing podcast={props.podcast} />
        </Show>
      </div>
    </div>
  );
}
```

---

## 样式改动摘要

### 主要变化

1. **移除复杂阴影**: 所有 `box-shadow` 简化为 `border: 1px solid`
2. **统一圆角**: 使用 CSS 变量 `--radius`
3. **精简颜色**: 只保留 6 种主要颜色
4. **主从布局样式**:

```css
/* 文件管理器主从布局 */
.file-list {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow-y: auto;
  max-height: 600px;
}

.file-list .selected {
  background: var(--primary);
  color: white;
}

.file-details {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.5rem;
}

/* 标签页样式 */
.tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  margin-bottom: 1rem;
}

.tabs button {
  padding: 0.75rem 1.5rem;
  border: none;
  background: none;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}

.tabs button.active {
  border-bottom-color: var(--primary);
  color: var(--primary);
}
```

---

## 最小可行实施（MVP）

如果时间有限，仅实施以下 3 项即可显著改善体验：

1. ✅ **集成 ModalProvider 和 ConfirmDialog**（已完成基础组件）
   - 修改 App.jsx 包裹 ModalProvider
   - 替换 FileManager 和 PodcastList 中的 confirm()

2. **合并任务窗口**
   - 重写 FloatingTaskWindow.jsx（使用上面的代码片段）
   - 删除 UploadProgressWindow.jsx
   - 更新 FileManager 移除 UploadProgressWindow 引用

3. **简化样式**
   - 修改 style.css，移除复杂阴影和渐变

这 3 项改动可以在 1-2 小时内完成，即可获得明显的 UI/UX 提升。

---

## 后续建议

完成 MVP 后，如果需要进一步优化：

- **FileManager 主从布局**（中等难度，3-4 小时）
- **ConfigEditor 标签页重构**（高难度，4-5 小时）
- **其他组件优化**（低优先级）

---

## 总结

- **快速路径**: 实施 MVP（3 项核心改动）
- **完整路径**: 按文件清单逐个重写（预计 2-3 天）
- **推荐**: 先完成 MVP，测试稳定后再逐步优化其他组件

所有详细代码框架已在 `REFACTOR_GUIDE.md` 中提供。
