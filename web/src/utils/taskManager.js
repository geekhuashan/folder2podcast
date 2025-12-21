import { createStore } from 'solid-js/store';
import { bilibiliAPI } from './api';

/**
 * 任务状态枚举
 */
export const TaskStatus = {
  PENDING: 'pending',      // 等待中
  DOWNLOADING: 'downloading', // 下载中
  COMPLETED: 'completed',  // 已完成
  FAILED: 'failed'         // 失败
};

/**
 * 下载任务管理器（重构版 - 使用异步 API）
 *
 * 功能：
 * - 管理下载任务列表
 * - 使用新的异步 API（立即返回 taskId）
 * - 通过轮询更新任务进度
 * - 支持多任务并发下载
 * - 提供任务历史记录
 */
class DownloadTaskManager {
  constructor() {
    // 使用 SolidJS store 管理任务列表
    const [tasks, setTasks] = createStore([]);
    this.tasks = tasks;
    this.setTasks = setTasks;

    // 任务 ID 计数器（用于本地标识）
    this.localTaskIdCounter = 1;

    // 轮询定时器映射：localTaskId -> intervalId
    this.pollingIntervals = new Map();
  }

  /**
   * 添加下载任务
   * @param {Object} taskData - 任务数据
   * @returns {Promise<number>} 本地任务 ID
   */
  async addTask(taskData) {
    const localTaskId = this.localTaskIdCounter++;

    // 创建初始任务对象
    const newTask = {
      id: localTaskId,
      serverTaskId: null, // 服务器端的 taskId
      url: taskData.url,
      podcastName: taskData.podcastName,
      episodeTitle: taskData.episodeTitle,
      autoCreatePodcast: taskData.autoCreatePodcast,
      selectPage: taskData.selectPage,
      status: TaskStatus.PENDING,
      percent: 0,
      speed: '0 KB/s',
      eta: '计算中...',
      current: 0,
      total: 1,
      fileName: null,
      filePaths: null,
      error: null,
      createdAt: new Date(),
      startedAt: null,
      completedAt: null
    };

    // 添加到任务列表
    this.setTasks((tasks) => [...tasks, newTask]);

    try {
      // 调用新的异步下载 API
      const result = await bilibiliAPI.download({
        url: taskData.url,
        podcastName: taskData.podcastName,
        episodeTitle: taskData.episodeTitle,
        autoCreatePodcast: taskData.autoCreatePodcast,
        selectPage: taskData.selectPage
      });

      if (!result.success) {
        throw new Error(result.error || '创建下载任务失败');
      }

      // 获取服务器端的 taskId
      const serverTaskId = result.data.taskId;

      // 更新任务，保存 serverTaskId
      const taskIndex = this.tasks.findIndex(t => t.id === localTaskId);
      if (taskIndex !== -1) {
        this.setTasks(taskIndex, {
          serverTaskId,
          status: TaskStatus.DOWNLOADING,
          startedAt: new Date()
        });

        // 开始轮询任务进度
        this.startPolling(localTaskId, serverTaskId);
      }

    } catch (error) {
      // 创建任务失败
      console.error('Failed to create download task:', error);
      const taskIndex = this.tasks.findIndex(t => t.id === localTaskId);
      if (taskIndex !== -1) {
        this.setTasks(taskIndex, {
          status: TaskStatus.FAILED,
          error: error.message || '创建任务失败',
          completedAt: new Date()
        });
      }
    }

    return localTaskId;
  }

  /**
   * 开始轮询任务进度
   * @param {number} localTaskId - 本地任务 ID
   * @param {string} serverTaskId - 服务器任务 ID
   */
  startPolling(localTaskId, serverTaskId) {
    // 立即查询一次
    this.pollTaskProgress(localTaskId, serverTaskId);

    // 每秒轮询一次
    const intervalId = setInterval(() => {
      this.pollTaskProgress(localTaskId, serverTaskId);
    }, 1000);

    this.pollingIntervals.set(localTaskId, intervalId);
  }

  /**
   * 停止轮询
   * @param {number} localTaskId - 本地任务 ID
   */
  stopPolling(localTaskId) {
    const intervalId = this.pollingIntervals.get(localTaskId);
    if (intervalId) {
      clearInterval(intervalId);
      this.pollingIntervals.delete(localTaskId);
    }
  }

  /**
   * 轮询任务进度
   * @param {number} localTaskId - 本地任务 ID
   * @param {string} serverTaskId - 服务器任务 ID
   */
  async pollTaskProgress(localTaskId, serverTaskId) {
    try {
      const result = await bilibiliAPI.getTaskProgress(serverTaskId);

      if (!result.success) {
        // 任务查询失败，停止轮询
        this.stopPolling(localTaskId);
        const taskIndex = this.tasks.findIndex(t => t.id === localTaskId);
        if (taskIndex !== -1) {
          this.setTasks(taskIndex, {
            status: TaskStatus.FAILED,
            error: result.error || '任务查询失败',
            completedAt: new Date()
          });
        }
        return;
      }

      const progress = result.data;
      const taskIndex = this.tasks.findIndex(t => t.id === localTaskId);
      if (taskIndex === -1) {
        // 任务不存在，停止轮询
        this.stopPolling(localTaskId);
        return;
      }

      // 更新任务进度
      this.setTasks(taskIndex, {
        status: progress.status,
        percent: progress.percent,
        speed: progress.speed,
        eta: progress.eta,
        current: progress.current,
        total: progress.total,
        fileName: progress.fileName,
        filePaths: progress.filePaths,
        error: progress.error
      });

      // 如果任务已完成或失败，停止轮询
      if (progress.status === 'completed' || progress.status === 'failed') {
        this.stopPolling(localTaskId);
        this.setTasks(taskIndex, {
          completedAt: new Date()
        });
      }

    } catch (error) {
      console.error('Failed to poll task progress:', error);
      // 网络错误时不停止轮询，继续尝试
    }
  }

  /**
   * 获取所有任务
   */
  getAllTasks() {
    return this.tasks;
  }

  /**
   * 获取活跃任务（未完成的）
   */
  getActiveTasks() {
    return this.tasks.filter(
      (task) => task.status === TaskStatus.PENDING || task.status === TaskStatus.DOWNLOADING
    );
  }

  /**
   * 获取已完成任务
   */
  getCompletedTasks() {
    return this.tasks.filter((task) => task.status === TaskStatus.COMPLETED);
  }

  /**
   * 获取失败任务
   */
  getFailedTasks() {
    return this.tasks.filter((task) => task.status === TaskStatus.FAILED);
  }

  /**
   * 清除已完成的任务
   */
  clearCompletedTasks() {
    // 停止已完成任务的轮询（如果有）
    this.tasks.forEach(task => {
      if (task.status === TaskStatus.COMPLETED) {
        this.stopPolling(task.id);
      }
    });

    this.setTasks((tasks) =>
      tasks.filter((task) => task.status !== TaskStatus.COMPLETED)
    );
  }

  /**
   * 清除所有任务
   */
  clearAllTasks() {
    // 停止所有轮询
    this.tasks.forEach(task => {
      this.stopPolling(task.id);
    });

    this.setTasks([]);
  }

  /**
   * 重试失败的任务
   * @param {number} taskId - 任务 ID
   */
  async retryTask(taskId) {
    const taskIndex = this.tasks.findIndex((task) => task.id === taskId);
    if (taskIndex === -1) return;

    const task = this.tasks[taskIndex];
    if (task.status !== TaskStatus.FAILED) return;

    // 创建新任务（复用原任务数据）
    await this.addTask({
      url: task.url,
      podcastName: task.podcastName,
      episodeTitle: task.episodeTitle,
      autoCreatePodcast: task.autoCreatePodcast,
      selectPage: task.selectPage
    });

    // 删除失败的旧任务
    this.setTasks((tasks) => tasks.filter((t) => t.id !== taskId));
  }

  /**
   * 清理资源（用于组件卸载时）
   */
  cleanup() {
    // 停止所有轮询
    this.pollingIntervals.forEach((intervalId) => {
      clearInterval(intervalId);
    });
    this.pollingIntervals.clear();
  }
}

// 创建全局单例
export const taskManager = new DownloadTaskManager();
