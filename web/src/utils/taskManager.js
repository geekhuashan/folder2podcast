import { createStore } from 'solid-js/store';
import { createSignal } from 'solid-js';
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
 * 下载任务管理器
 *
 * 功能：
 * - 管理下载任务队列
 * - 依次执行任务（不并发，避免服务器压力）
 * - 提供任务状态查询
 * - 支持任务历史记录
 */
class DownloadTaskManager {
  constructor() {
    // 使用 SolidJS store 管理任务列表
    const [tasks, setTasks] = createStore([]);
    this.tasks = tasks;
    this.setTasks = setTasks;

    // 当前是否正在执行任务
    const [isProcessing, setIsProcessing] = createSignal(false);
    this.isProcessing = isProcessing;
    this.setIsProcessing = setIsProcessing;

    // 任务 ID 计数器
    this.taskIdCounter = 1;
  }

  /**
   * 添加下载任务到队列
   * @param {Object} taskData - 任务数据
   * @returns {number} 任务 ID
   */
  addTask(taskData) {
    const taskId = this.taskIdCounter++;

    const newTask = {
      id: taskId,
      url: taskData.url,
      podcastName: taskData.podcastName,
      episodeTitle: taskData.episodeTitle,
      autoCreatePodcast: taskData.autoCreatePodcast,
      status: TaskStatus.PENDING,
      progress: 0,
      result: null,
      error: null,
      createdAt: new Date(),
      startedAt: null,
      completedAt: null
    };

    // 添加到任务列表
    this.setTasks((tasks) => [...tasks, newTask]);

    // 如果当前没有正在执行的任务，立即开始处理
    if (!this.isProcessing()) {
      this.processQueue();
    }

    return taskId;
  }

  /**
   * 处理任务队列（依次执行）
   */
  async processQueue() {
    if (this.isProcessing()) {
      return; // 已经在处理中
    }

    // 查找第一个待处理的任务
    const pendingTaskIndex = this.tasks.findIndex(
      (task) => task.status === TaskStatus.PENDING
    );

    if (pendingTaskIndex === -1) {
      // 没有待处理的任务了
      this.setIsProcessing(false);
      return;
    }

    this.setIsProcessing(true);
    const task = this.tasks[pendingTaskIndex];

    try {
      // 更新任务状态为下载中
      this.setTasks(pendingTaskIndex, (task) => ({
        ...task,
        status: TaskStatus.DOWNLOADING,
        startedAt: new Date()
      }));

      // 调用下载 API
      const result = await bilibiliAPI.download({
        url: task.url,
        podcastName: task.podcastName,
        episodeTitle: task.episodeTitle,
        autoCreatePodcast: task.autoCreatePodcast
      });

      // 下载成功
      if (result.success) {
        this.setTasks(pendingTaskIndex, (task) => ({
          ...task,
          status: TaskStatus.COMPLETED,
          progress: 100,
          result: result.data,
          completedAt: new Date()
        }));
      } else {
        // 下载失败
        this.setTasks(pendingTaskIndex, (task) => ({
          ...task,
          status: TaskStatus.FAILED,
          error: result.error || '下载失败',
          completedAt: new Date()
        }));
      }
    } catch (error) {
      // 异常处理
      console.error('Task execution error:', error);
      this.setTasks(pendingTaskIndex, (task) => ({
        ...task,
        status: TaskStatus.FAILED,
        error: error.message || '网络错误',
        completedAt: new Date()
      }));
    }

    // 继续处理下一个任务
    this.setIsProcessing(false);
    this.processQueue();
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
    this.setTasks((tasks) =>
      tasks.filter((task) => task.status !== TaskStatus.COMPLETED)
    );
  }

  /**
   * 清除所有任务
   */
  clearAllTasks() {
    this.setTasks([]);
  }

  /**
   * 重试失败的任务
   * @param {number} taskId - 任务 ID
   */
  retryTask(taskId) {
    const taskIndex = this.tasks.findIndex((task) => task.id === taskId);
    if (taskIndex === -1) return;

    const task = this.tasks[taskIndex];
    if (task.status !== TaskStatus.FAILED) return;

    // 重置任务状态
    this.setTasks(taskIndex, (task) => ({
      ...task,
      status: TaskStatus.PENDING,
      error: null,
      result: null,
      completedAt: null
    }));

    // 重新处理队列
    if (!this.isProcessing()) {
      this.processQueue();
    }
  }
}

// 创建全局单例
export const taskManager = new DownloadTaskManager();
