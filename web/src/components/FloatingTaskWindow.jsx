import { createSignal, createMemo, For, Show } from 'solid-js';
import { taskManager, TaskStatus } from '../utils/taskManager';

/**
 * 右下角浮动任务窗口
 * - 收起时显示小圆形按钮
 * - 展开时显示完整任务列表
 */
export default function FloatingTaskWindow() {
  const [isExpanded, setIsExpanded] = createSignal(false);

  const tasks = createMemo(() => taskManager.getAllTasks());

  const stats = createMemo(() => {
    const list = tasks();
    return {
      total: list.length,
      pending: list.filter(t => t.status === TaskStatus.PENDING).length,
      downloading: list.filter(t => t.status === TaskStatus.DOWNLOADING).length,
      completed: list.filter(t => t.status === TaskStatus.COMPLETED).length,
      failed: list.filter(t => t.status === TaskStatus.FAILED).length
    };
  });

  const getStatusClass = (status) => {
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
  };

  const getStatusLabel = (status) => {
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
  };

  const getStatusIcon = (status) => {
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
  };

  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const handleClearCompleted = () => taskManager.clearCompletedTasks();
  const handleRetryTask = (taskId) => taskManager.retryTask(taskId);

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
          <Show when={stats().downloading > 0 || stats().pending > 0}>
            <span class="floating-task__badge">
              {stats().downloading + stats().pending}
            </span>
          </Show>

          {/* 下载中指示器 */}
          <Show when={stats().downloading > 0}>
            <span class="floating-task__indicator">
              ⬇️
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
                <div class="floating-task__title">下载中心</div>
                <div class="floating-task__subtitle">
                  {stats().downloading > 0 ? (
                    `${stats().downloading} 个下载中`
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
                {stats().downloading}
              </span>
              <span class="floating-task__stat-label">下载中</span>
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
              when={tasks().length > 0}
              fallback={<div class="floating-task__empty">暂无下载任务</div>}
            >
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
                            {task.episodeTitle || task.url}
                          </div>
                          <span class={`floating-task-item__status ${getStatusClass(task.status)}`}>
                            {getStatusLabel(task.status)}
                          </span>
                        </div>

                        <div class="floating-task-item__meta">
                          📻 {task.podcastName || (task.autoCreatePodcast ? '自动创建' : '未指定')}
                          {' · '}
                          {formatTime(task.completedAt || task.startedAt || task.createdAt)}
                        </div>

                        {/* 下载进度 */}
                        <Show when={task.status === TaskStatus.DOWNLOADING && task.progress}>
                          <div class="floating-task-item__progress">
                            <div class="floating-task-item__progress-bar">
                              <div
                                class="floating-task-item__progress-fill"
                                style={{ width: `${task.progress || 0}%` }}
                              />
                            </div>
                            <div class="floating-task-item__progress-text">
                              {task.progress || 0}%
                            </div>
                          </div>
                        </Show>

                        {/* 失败信息 */}
                        <Show when={task.status === TaskStatus.FAILED && task.error}>
                          <div class="floating-task-item__error">
                            {task.error}
                          </div>
                          <button class="btn btn-sm btn-secondary" onClick={() => handleRetryTask(task.id)}>
                            重新下载
                          </button>
                        </Show>

                        {/* 完成信息 */}
                        <Show when={task.status === TaskStatus.COMPLETED && task.result}>
                          <div class="floating-task-item__success">
                            ✓ {task.result.fileName}
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
