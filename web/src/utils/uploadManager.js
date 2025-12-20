import { createStore } from 'solid-js/store';

/**
 * 上传任务状态管理器
 * 使用 SolidJS Store 管理文件上传任务的状态和进度
 */

// 任务状态枚举
export const UploadStatus = {
  PENDING: 'pending',       // 等待上传
  UPLOADING: 'uploading',   // 上传中
  COMPLETED: 'completed',   // 上传完成
  FAILED: 'failed'          // 上传失败
};

// 初始化 Store
const [uploadState, setUploadState] = createStore({
  tasks: [],      // 上传任务列表
  summary: {      // 汇总信息
    total: 0,
    uploading: 0,
    completed: 0,
    failed: 0
  }
});

/**
 * 生成唯一任务 ID
 */
let taskIdCounter = 0;
function generateTaskId() {
  return `upload-${Date.now()}-${++taskIdCounter}`;
}

/**
 * 更新汇总信息
 */
function updateSummary() {
  const tasks = uploadState.tasks;
  setUploadState('summary', {
    total: tasks.length,
    uploading: tasks.filter(t => t.status === UploadStatus.UPLOADING).length,
    completed: tasks.filter(t => t.status === UploadStatus.COMPLETED).length,
    failed: tasks.filter(t => t.status === UploadStatus.FAILED).length
  });
}

/**
 * 添加上传任务
 * @param {File} file - 要上传的文件对象
 * @param {string} podcastDir - 目标播客目录
 * @returns {string} 任务 ID
 */
export function addUploadTask(file, podcastDir) {
  const taskId = generateTaskId();

  setUploadState('tasks', tasks => [
    ...tasks,
    {
      id: taskId,
      fileName: file.name,
      fileSize: file.size,
      podcastDir,
      progress: 0,      // 上传进度 (0-100)
      status: UploadStatus.PENDING,
      error: null,
      createdAt: new Date().toISOString()
    }
  ]);

  updateSummary();
  return taskId;
}

/**
 * 更新任务进度
 * @param {string} taskId - 任务 ID
 * @param {number} progress - 进度百分比 (0-100)
 */
export function updateTaskProgress(taskId, progress) {
  const index = uploadState.tasks.findIndex(t => t.id === taskId);
  if (index !== -1) {
    setUploadState('tasks', index, 'progress', Math.min(100, Math.max(0, progress)));

    // 如果进度达到 100 且状态仍为 uploading，保持 uploading（等待服务器响应）
    if (uploadState.tasks[index].status === UploadStatus.PENDING && progress > 0) {
      setUploadState('tasks', index, 'status', UploadStatus.UPLOADING);
      updateSummary();
    }
  }
}

/**
 * 标记任务为上传中
 * @param {string} taskId - 任务 ID
 */
export function markTaskUploading(taskId) {
  const index = uploadState.tasks.findIndex(t => t.id === taskId);
  if (index !== -1) {
    setUploadState('tasks', index, 'status', UploadStatus.UPLOADING);
    updateSummary();
  }
}

/**
 * 标记任务完成
 * @param {string} taskId - 任务 ID
 */
export function markTaskCompleted(taskId) {
  const index = uploadState.tasks.findIndex(t => t.id === taskId);
  if (index !== -1) {
    setUploadState('tasks', index, {
      status: UploadStatus.COMPLETED,
      progress: 100,
      error: null
    });
    updateSummary();
  }
}

/**
 * 标记任务失败
 * @param {string} taskId - 任务 ID
 * @param {string} error - 错误信息
 */
export function markTaskFailed(taskId, error) {
  const index = uploadState.tasks.findIndex(t => t.id === taskId);
  if (index !== -1) {
    setUploadState('tasks', index, {
      status: UploadStatus.FAILED,
      error
    });
    updateSummary();
  }
}

/**
 * 移除任务
 * @param {string} taskId - 任务 ID
 */
export function removeTask(taskId) {
  setUploadState('tasks', tasks => tasks.filter(t => t.id !== taskId));
  updateSummary();
}

/**
 * 清除已完成的任务
 */
export function clearCompletedTasks() {
  setUploadState('tasks', tasks =>
    tasks.filter(t => t.status !== UploadStatus.COMPLETED)
  );
  updateSummary();
}

/**
 * 清除所有任务
 */
export function clearAllTasks() {
  setUploadState('tasks', []);
  updateSummary();
}

/**
 * 获取任务状态
 * @param {string} taskId - 任务 ID
 * @returns {Object|null} 任务对象
 */
export function getTask(taskId) {
  return uploadState.tasks.find(t => t.id === taskId) || null;
}

/**
 * 导出 Store 供组件使用
 */
export { uploadState };
