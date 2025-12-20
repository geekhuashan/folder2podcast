import { createSignal, createMemo, createEffect, For, Show } from 'solid-js';
import { uploadState, UploadStatus, clearCompletedTasks } from '../utils/uploadManager';

/**
 * 文件上传进度浮动窗口
 * - 收起时显示小圆形按钮
 * - 展开时显示完整上传进度列表
 * - 自动在所有任务完成后 3 秒收起
 */
export default function UploadProgressWindow() {
  const [isExpanded, setIsExpanded] = createSignal(false);

  // 创建响应式的统计数据
  const stats = createMemo(() => uploadState.summary);

  // 创建响应式的任务列表
  const tasks = createMemo(() => uploadState.tasks);

  // 检查是否有活动任务
  const hasActiveTasks = createMemo(() =>
    stats().uploading > 0 || stats().pending > 0
  );

  // 检查是否所有任务都已完成
  const allTasksCompleted = createMemo(() =>
    tasks().length > 0 &&
    stats().uploading === 0 &&
    stats().pending === 0
  );

  // 自动收起逻辑：所有任务完成后 3 秒自动收起
  createEffect(() => {
    if (allTasksCompleted() && isExpanded()) {
      const timer = setTimeout(() => {
        setIsExpanded(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  });

  // 自动展开逻辑：有新任务开始上传时自动展开
  createEffect(() => {
    if (stats().uploading > 0 && !isExpanded()) {
      setIsExpanded(true);
    }
  });

  /**
   * 格式化文件大小
   */
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  /**
   * 格式化时间
   */
  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  /**
   * 获取状态类名
   */
  const getStatusClass = (status) => {
    switch (status) {
      case UploadStatus.PENDING:
        return 'floating-task-item__status--pending';
      case UploadStatus.UPLOADING:
        return 'floating-task-item__status--downloading';
      case UploadStatus.COMPLETED:
        return 'floating-task-item__status--completed';
      case UploadStatus.FAILED:
        return 'floating-task-item__status--failed';
      default:
        return 'floating-task-item__status--pending';
    }
  };

  /**
   * 获取状态标签
   */
  const getStatusLabel = (status) => {
    switch (status) {
      case UploadStatus.PENDING:
        return '等待中';
      case UploadStatus.UPLOADING:
        return '上传中';
      case UploadStatus.COMPLETED:
        return '已完成';
      case UploadStatus.FAILED:
        return '失败';
      default:
        return '未知';
    }
  };

  /**
   * 获取状态图标
   */
  const getStatusIcon = (status) => {
    switch (status) {
      case UploadStatus.PENDING:
        return '⏳';
      case UploadStatus.UPLOADING:
        return '⬆️';
      case UploadStatus.COMPLETED:
        return '✓';
      case UploadStatus.FAILED:
        return '⚠';
      default:
        return '•';
    }
  };

  const handleClearCompleted = () => clearCompletedTasks();

  // 如果没有任务，不显示窗口
  if (tasks().length === 0) {
    return null;
  }

  return (
    <div class="floating-task">
      <Show when={isExpanded()} fallback={
        // 收起状态：圆形浮动按钮
        <button
          class="floating-task__button"
          onClick={() => setIsExpanded(true)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
          </svg>

          {/* 活动任务徽章 */}
          <Show when={hasActiveTasks()}>
            <span class="floating-task__badge">
              {stats().uploading + stats().pending}
            </span>
          </Show>

          {/* 上传中指示器 */}
          <Show when={stats().uploading > 0}>
            <span class="floating-task__indicator">
              ⬆️
            </span>
          </Show>
        </button>
      }>
        {/* 展开状态：完整任务面板 */}
        <div class="floating-task__panel">
          {/* 头部 */}
          <div class="floating-task__header">
            <div class="floating-task__header-info">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
              <div>
                <div class="floating-task__title">上传中心</div>
                <div class="floating-task__subtitle">
                  {stats().uploading > 0 ? (
                    `${stats().uploading} 个上传中`
                  ) : (
                    `${stats().total} 个任务`
                  )}
                </div>
              </div>
            </div>
            <button
              class="floating-task__close"
              onClick={() => setIsExpanded(false)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* 统计信息 */}
          <div class="floating-task__stats">
            <div class="floating-task__stat">
              <span class="floating-task__stat-value floating-task__stat-value--downloading">
                {stats().uploading}
              </span>
              <span class="floating-task__stat-label">上传中</span>
            </div>
            <div class="floating-task__stat">
              <span class="floating-task__stat-value floating-task__stat-value--pending">
                {stats().pending}
              </span>
              <span class="floating-task__stat-label">等待</span>
            </div>
            <div class="floating-task__stat">
              <span class="floating-task__stat-value floating-task__stat-value--completed">
                {stats().completed}
              </span>
              <span class="floating-task__stat-label">完成</span>
            </div>
            <div class="floating-task__stat">
              <span class="floating-task__stat-value floating-task__stat-value--failed">
                {stats().failed}
              </span>
              <span class="floating-task__stat-label">失败</span>
            </div>
          </div>

          {/* 任务列表 */}
          <div class="floating-task__list">
            <For each={tasks().slice().reverse()}>
              {(task) => (
                <div class="floating-task-item">
                  <div class="floating-task-item__header">
                    <div class="floating-task-item__icon">
                      {getStatusIcon(task.status)}
                    </div>
                    <div class="floating-task-item__content">
                      <div class="floating-task-item__top">
                        <div class="floating-task-item__title">
                          {task.fileName}
                        </div>
                        <span class={`floating-task-item__status ${getStatusClass(task.status)}`}>
                          {getStatusLabel(task.status)}
                        </span>
                      </div>

                      <div class="floating-task-item__meta">
                        📦 {formatFileSize(task.fileSize)}
                        {' · '}
                        {formatTime(task.createdAt)}
                      </div>

                      {/* 上传进度 */}
                      <Show when={task.status === UploadStatus.UPLOADING || task.status === UploadStatus.PENDING}>
                        <div class="floating-task-item__progress">
                          <div class="floating-task-item__progress-bar">
                            <div
                              class="floating-task-item__progress-fill"
                              style={{ width: `${task.progress || 0}%` }}
                            />
                          </div>
                          <div class="floating-task-item__progress-text">
                            {Math.round(task.progress || 0)}%
                          </div>
                        </div>
                      </Show>

                      {/* 失败信息 */}
                      <Show when={task.status === UploadStatus.FAILED && task.error}>
                        <div class="floating-task-item__error">
                          {task.error}
                        </div>
                      </Show>

                      {/* 完成信息 */}
                      <Show when={task.status === UploadStatus.COMPLETED}>
                        <div class="floating-task-item__success">
                          ✓ 上传成功
                        </div>
                      </Show>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>

          {/* 底部操作 */}
          <Show when={stats().completed > 0}>
            <div class="floating-task__footer">
              <button class="btn btn-sm btn-secondary" style={{ width: '100%' }} onClick={handleClearCompleted}>
                清除已完成 ({stats().completed})
              </button>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}
