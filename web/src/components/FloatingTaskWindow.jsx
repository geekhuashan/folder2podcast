import { createSignal, createMemo, For, Show } from 'solid-js';
import { taskManager, TaskStatus } from '../utils/taskManager';

/**
 * 浮动任务窗口组件
 *
 * 显示在页面右下角的可展开/收起的任务列表窗口
 */
export default function FloatingTaskWindow(props) {
  const [isExpanded, setIsExpanded] = createSignal(true);

  // 获取任务统计 - 使用 createMemo 让它成为响应式计算
  const stats = createMemo(() => {
    const tasks = taskManager.getAllTasks();
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === TaskStatus.PENDING).length,
      downloading: tasks.filter(t => t.status === TaskStatus.DOWNLOADING).length,
      completed: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
      failed: tasks.filter(t => t.status === TaskStatus.FAILED).length
    };
  });

  // 获取状态图标和颜色
  const getStatusIcon = (status) => {
    switch (status) {
      case TaskStatus.PENDING:
        return { icon: '⏳', color: '#6b7280', text: '等待中' };
      case TaskStatus.DOWNLOADING:
        return { icon: '⬇️', color: '#3b82f6', text: '下载中' };
      case TaskStatus.COMPLETED:
        return { icon: '✅', color: '#10b981', text: '已完成' };
      case TaskStatus.FAILED:
        return { icon: '❌', color: '#ef4444', text: '失败' };
      default:
        return { icon: '❓', color: '#6b7280', text: '未知' };
    }
  };

  // 格式化时间
  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // 清除已完成任务
  const handleClearCompleted = () => {
    taskManager.clearCompletedTasks();
  };

  // 重试失败任务
  const handleRetryTask = (taskId) => {
    taskManager.retryTask(taskId);
  };

  // 计算是否有活跃任务
  const hasActiveTasks = createMemo(() => {
    return stats().pending + stats().downloading > 0;
  });

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: isExpanded() ? '400px' : '200px',
      'max-height': '600px',
      'z-index': 1000,
      transition: 'all 0.3s ease'
    }}>
      {/* 窗口头部 */}
      <div
        style={{
          background: hasActiveTasks() ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : '#1f2937',
          color: 'white',
          padding: '12px 16px',
          'border-radius': '12px 12px 0 0',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'space-between',
          cursor: 'pointer',
          'box-shadow': '0 4px 12px rgba(0,0,0,0.15)'
        }}
        onClick={() => setIsExpanded(!isExpanded())}
      >
        <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
          <span style={{ 'font-size': '1.2rem' }}>📥</span>
          <div>
            <div style={{ 'font-weight': '600', 'font-size': '0.95rem' }}>
              下载任务
            </div>
            <div style={{ 'font-size': '0.75rem', opacity: 0.9 }}>
              {hasActiveTasks()
                ? `${stats().downloading} 下载中, ${stats().pending} 等待中`
                : `${stats().total} 个任务`
              }
            </div>
          </div>
        </div>
        <button
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: 'white',
            'border-radius': '6px',
            padding: '4px 8px',
            cursor: 'pointer',
            'font-size': '0.9rem'
          }}
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded());
          }}
        >
          {isExpanded() ? '▼' : '▲'}
        </button>
      </div>

      {/* 窗口内容 */}
      <Show when={isExpanded()}>
        <div style={{
          background: 'white',
          'border-radius': '0 0 12px 12px',
          'box-shadow': '0 4px 12px rgba(0,0,0,0.15)',
          overflow: 'hidden'
        }}>
          {/* 统计信息 */}
          <div style={{
            padding: '12px 16px',
            'border-bottom': '1px solid #e5e7eb',
            display: 'grid',
            'grid-template-columns': 'repeat(4, 1fr)',
            gap: '8px',
            background: '#f9fafb'
          }}>
            <div style={{ 'text-align': 'center' }}>
              <div style={{ 'font-size': '1.25rem', 'font-weight': '600', color: '#6b7280' }}>
                {stats().pending}
              </div>
              <div style={{ 'font-size': '0.7rem', color: '#9ca3af' }}>等待</div>
            </div>
            <div style={{ 'text-align': 'center' }}>
              <div style={{ 'font-size': '1.25rem', 'font-weight': '600', color: '#3b82f6' }}>
                {stats().downloading}
              </div>
              <div style={{ 'font-size': '0.7rem', color: '#9ca3af' }}>下载</div>
            </div>
            <div style={{ 'text-align': 'center' }}>
              <div style={{ 'font-size': '1.25rem', 'font-weight': '600', color: '#10b981' }}>
                {stats().completed}
              </div>
              <div style={{ 'font-size': '0.7rem', color: '#9ca3af' }}>完成</div>
            </div>
            <div style={{ 'text-align': 'center' }}>
              <div style={{ 'font-size': '1.25rem', 'font-weight': '600', color: '#ef4444' }}>
                {stats().failed}
              </div>
              <div style={{ 'font-size': '0.7rem', color: '#9ca3af' }}>失败</div>
            </div>
          </div>

          {/* 任务列表 */}
          <div style={{
            'max-height': '400px',
            'overflow-y': 'auto',
            padding: '8px'
          }}>
            <Show
              when={taskManager.getAllTasks().length > 0}
              fallback={
                <div style={{
                  padding: '2rem',
                  'text-align': 'center',
                  color: '#9ca3af',
                  'font-size': '0.9rem'
                }}>
                  暂无下载任务
                </div>
              }
            >
              <For each={taskManager.getAllTasks().slice().reverse()}>
                {(task) => {
                  const statusInfo = getStatusIcon(task.status);
                  return (
                    <div style={{
                      background: '#f9fafb',
                      'border-radius': '8px',
                      padding: '10px 12px',
                      'margin-bottom': '8px',
                      border: `1px solid ${
                        task.status === TaskStatus.DOWNLOADING ? '#3b82f6' :
                        task.status === TaskStatus.FAILED ? '#ef4444' : '#e5e7eb'
                      }`
                    }}>
                      <div style={{
                        display: 'flex',
                        'align-items': 'flex-start',
                        gap: '10px'
                      }}>
                        {/* 状态图标 */}
                        <div style={{
                          'font-size': '1.5rem',
                          'flex-shrink': 0,
                          'margin-top': '2px'
                        }}>
                          {statusInfo.icon}
                        </div>

                        {/* 任务信息 */}
                        <div style={{ flex: 1, 'min-width': 0 }}>
                          {/* 视频 URL */}
                          <div style={{
                            'font-size': '0.85rem',
                            'font-weight': '600',
                            color: '#1f2937',
                            'margin-bottom': '4px',
                            overflow: 'hidden',
                            'text-overflow': 'ellipsis',
                            'white-space': 'nowrap'
                          }}>
                            {task.episodeTitle || task.url}
                          </div>

                          {/* 播客名称 */}
                          <div style={{
                            'font-size': '0.75rem',
                            color: '#6b7280',
                            'margin-bottom': '6px'
                          }}>
                            📻 {task.podcastName || (task.autoCreatePodcast ? '自动创建' : '未指定')}
                          </div>

                          {/* 状态和时间 */}
                          <div style={{
                            display: 'flex',
                            'align-items': 'center',
                            'justify-content': 'space-between',
                            'font-size': '0.7rem'
                          }}>
                            <span style={{ color: statusInfo.color, 'font-weight': '500' }}>
                              {statusInfo.text}
                            </span>
                            <span style={{ color: '#9ca3af' }}>
                              {formatTime(task.completedAt || task.startedAt || task.createdAt)}
                            </span>
                          </div>

                          {/* 错误信息 */}
                          <Show when={task.status === TaskStatus.FAILED && task.error}>
                            <div style={{
                              'margin-top': '6px',
                              padding: '6px 8px',
                              background: '#fee2e2',
                              'border-radius': '4px',
                              'font-size': '0.7rem',
                              color: '#dc2626'
                            }}>
                              {task.error}
                            </div>
                          </Show>

                          {/* 成功结果 */}
                          <Show when={task.status === TaskStatus.COMPLETED && task.result}>
                            <div style={{
                              'margin-top': '6px',
                              padding: '6px 8px',
                              background: '#d1fae5',
                              'border-radius': '4px',
                              'font-size': '0.7rem',
                              color: '#065f46'
                            }}>
                              ✓ {task.result.fileName}
                            </div>
                          </Show>

                          {/* 重试按钮 */}
                          <Show when={task.status === TaskStatus.FAILED}>
                            <button
                              class="btn btn-sm"
                              style={{
                                'margin-top': '8px',
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                padding: '4px 10px',
                                'font-size': '0.75rem'
                              }}
                              onClick={() => handleRetryTask(task.id)}
                            >
                              🔄 重试
                            </button>
                          </Show>
                        </div>
                      </div>
                    </div>
                  );
                }}
              </For>
            </Show>
          </div>

          {/* 底部操作按钮 */}
          <Show when={stats().completed > 0 || stats().failed > 0}>
            <div style={{
              padding: '12px 16px',
              'border-top': '1px solid #e5e7eb',
              background: '#f9fafb',
              display: 'flex',
              gap: '8px'
            }}>
              <Show when={stats().completed > 0}>
                <button
                  class="btn btn-sm"
                  style={{
                    flex: 1,
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    padding: '6px',
                    'font-size': '0.8rem'
                  }}
                  onClick={handleClearCompleted}
                >
                  清除已完成
                </button>
              </Show>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}
