import { createSignal, createMemo, For, Show } from 'solid-js';
import { taskManager, TaskStatus } from '../utils/taskManager';
import { uploadState, UploadStatus } from '../utils/uploadManager';

/**
 * 右下角浮动任务窗口
 * - 收起时显示小圆形按钮
 * - 展开时显示完整任务列表
 * - 同时显示下载任务和上传任务
 */
export default function FloatingTaskWindow() {
  const [isExpanded, setIsExpanded] = createSignal(false);

  const downloadTasks = createMemo(() => taskManager.getAllTasks());
  const uploadTasks = createMemo(() => uploadState.tasks);

  // 合并所有任务
  const allTasks = createMemo(() => {
    const downloads = downloadTasks().map(t => ({ ...t, type: 'download' }));
    const uploads = uploadTasks().map(t => ({ ...t, type: 'upload' }));
    return [...downloads, ...uploads];
  });

  const stats = createMemo(() => {
    const dTasks = downloadTasks();
    const uTasks = uploadTasks();

    return {
      total: dTasks.length + uTasks.length,
      pending: dTasks.filter(t => t.status === TaskStatus.PENDING).length +
               uTasks.filter(t => t.status === UploadStatus.PENDING).length,
      active: dTasks.filter(t => t.status === TaskStatus.DOWNLOADING).length +
              uTasks.filter(t => t.status === UploadStatus.UPLOADING).length,
      completed: dTasks.filter(t => t.status === TaskStatus.COMPLETED).length +
                 uTasks.filter(t => t.status === UploadStatus.COMPLETED).length,
      failed: dTasks.filter(t => t.status === TaskStatus.FAILED).length +
              uTasks.filter(t => t.status === UploadStatus.FAILED).length
    };
  });

  const getStatusClass = (task) => {
    const status = task.status;
    if (task.type === 'upload') {
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
    } else {
      switch (status) {
        case TaskStatus.PENDING:
          return 'floating-task-item__status--pending';
        case TaskStatus.DOWNLOADING:
          return 'floating-task-item__status--downloading';
        case TaskStatus.COMPLETED:
          return 'floating-task-item__status--completed';
        case TaskStatus.FAILED:
          return 'floating-task-item__status--failed';
        default:
          return 'floating-task-item__status--pending';
      }
    }
  };

  const getStatusLabel = (task) => {
    const status = task.status;
    if (task.type === 'upload') {
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
    } else {
      switch (status) {
        case TaskStatus.PENDING:
          return '等待中';
        case TaskStatus.DOWNLOADING:
          return '下载中';
        case TaskStatus.COMPLETED:
          return '已完成';
        case TaskStatus.FAILED:
          return '失败';
        default:
          return '未知';
      }
    }
  };

  const getStatusIcon = (task) => {
    const status = task.status;
    if (task.type === 'upload') {
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
    } else {
      switch (status) {
        case TaskStatus.PENDING:
          return '⏳';
        case TaskStatus.DOWNLOADING:
          return '⬇️';
        case TaskStatus.COMPLETED:
          return '✓';
        case TaskStatus.FAILED:
          return '⚠';
        default:
          return '•';
      }
    }
  };

  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const handleClearCompleted = () => {
    taskManager.clearCompletedTasks();
    const { clearCompletedTasks } = require('../utils/uploadManager');
    clearCompletedTasks();
  };

  const handleRetryTask = (task) => {
    if (task.type === 'download') {
      taskManager.retryTask(task.id);
    }
    // 上传任务暂不支持重试
  };

  const isActive = (task) => {
    if (task.type === 'upload') {
      return task.status === UploadStatus.UPLOADING;
    } else {
      return task.status === TaskStatus.DOWNLOADING;
    }
  };

  const isFailed = (task) => {
    if (task.type === 'upload') {
      return task.status === UploadStatus.FAILED;
    } else {
      return task.status === TaskStatus.FAILED;
    }
  };

  const isCompleted = (task) => {
    if (task.type === 'upload') {
      return task.status === UploadStatus.COMPLETED;
    } else {
      return task.status === TaskStatus.COMPLETED;
    }
  };

  return (
    <div class="floating-task">
      <Show when={isExpanded()} fallback={
        // 收起状态：圆形浮动按钮
        <button
          class="floating-task__button"
          onClick={() => setIsExpanded(true)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>

          {/* 活动任务徽章 */}
          <Show when={stats().active > 0 || stats().pending > 0}>
            <span class="floating-task__badge">
              {stats().active + stats().pending}
            </span>
          </Show>

          {/* 活动指示器 */}
          <Show when={stats().active > 0}>
            <span class="floating-task__indicator">
              {uploadTasks().some(t => t.status === UploadStatus.UPLOADING) ? '⬆️' : '⬇️'}
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
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
              <div>
                <div class="floating-task__title">任务中心</div>
                <div class="floating-task__subtitle">
                  {stats().active > 0 ? (
                    `${stats().active} 个任务进行中`
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
                {stats().active}
              </span>
              <span class="floating-task__stat-label">进行中</span>
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
            <Show
              when={allTasks().length > 0}
              fallback={<div class="floating-task__empty">暂无任务</div>}
            >
              <For each={allTasks().slice().reverse()}>
                {(task) => (
                  <div class="floating-task-item">
                    <div class="floating-task-item__header">
                      <div class="floating-task-item__icon">
                        {getStatusIcon(task)}
                      </div>
                      <div class="floating-task-item__content">
                        <div class="floating-task-item__top">
                          <div class="floating-task-item__title">
                            {task.type === 'upload' ? task.fileName : (task.episodeTitle || task.url)}
                          </div>
                          <span class={`floating-task-item__status ${getStatusClass(task)}`}>
                            {getStatusLabel(task)}
                          </span>
                        </div>

                        <div class="floating-task-item__meta">
                          📻 {task.podcastDir || task.podcastName || (task.autoCreatePodcast ? '自动创建' : '未指定')}
                          {' · '}
                          {formatTime(task.completedAt || task.startedAt || task.createdAt)}
                        </div>

                        {/* 进度条 */}
                        <Show when={isActive(task) && task.progress !== undefined}>
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
                        <Show when={isFailed(task) && task.error}>
                          <div class="floating-task-item__error">
                            {task.error}
                          </div>
                          <Show when={task.type === 'download'}>
                            <button class="btn btn-sm btn-secondary" onClick={() => handleRetryTask(task)}>
                              重新下载
                            </button>
                          </Show>
                        </Show>

                        {/* 完成信息 */}
                        <Show when={isCompleted(task)}>
                          <div class="floating-task-item__success">
                            ✓ {task.type === 'upload' ? '上传成功' : (task.result?.fileName || '下载成功')}
                          </div>
                        </Show>
                      </div>
                    </div>
                  </div>
                )}
              </For>
            </Show>
          </div>

          {/* 底部操作 */}
          <Show when={stats().completed > 0}>
            <div class="floating-task__footer">
              <button class="btn btn-sm btn-secondary" style={{ width: '100%' }} onClick={handleClearCompleted}>
                清除已完成
              </button>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}
