/**
 * Zustand 状态管理
 */

import { create } from 'zustand';
import type { Podcast } from '@/lib/types';

interface AppState {
  // 认证状态
  isAuthenticated: boolean;
  username: string | null;  // 新增：用户名
  setAuthenticated: (value: boolean, username?: string) => void;

  // 当前选中的播客
  selectedPodcast: Podcast | null;
  setSelectedPodcast: (podcast: Podcast | null) => void;

  // 创建/编辑播客对话框
  isCreateDialogOpen: boolean;
  setCreateDialogOpen: (value: boolean) => void;

  editingPodcast: Podcast | null;
  setEditingPodcast: (podcast: Podcast | null) => void;

  // 上传对话框
  isUploadDialogOpen: boolean;
  uploadPodcastId: string | null;
  setUploadDialogOpen: (value: boolean, podcastId?: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // 认证
  isAuthenticated: false,
  username: null,
  setAuthenticated: (value, username) => set({
    isAuthenticated: value,
    username: value ? username || null : null  // 认证时设置用户名，登出时清空
  }),

  // 选中的播客
  selectedPodcast: null,
  setSelectedPodcast: (podcast) => set({ selectedPodcast: podcast }),

  // 创建/编辑对话框
  isCreateDialogOpen: false,
  setCreateDialogOpen: (value) => set({ isCreateDialogOpen: value }),

  editingPodcast: null,
  setEditingPodcast: (podcast) => set({ editingPodcast: podcast }),

  // 上传对话框
  isUploadDialogOpen: false,
  uploadPodcastId: null,
  setUploadDialogOpen: (value, podcastId) =>
    set({ isUploadDialogOpen: value, uploadPodcastId: podcastId || null }),
}));
