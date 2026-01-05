import { create } from 'zustand';

/**
 * 弹窗类型
 */
export type DialogType = 'alert' | 'confirm';

/**
 * 弹窗配置
 */
export interface DialogConfig {
  type: DialogType;
  title?: string;
  content: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface DialogState {
  isOpen: boolean;
  config: DialogConfig | null;

  // 打开弹窗
  openDialog: (config: DialogConfig) => void;

  // 关闭弹窗
  closeDialog: () => void;

  // 便捷方法：显示提示
  showAlert: (content: string, title?: string) => Promise<void>;

  // 便捷方法：显示确认
  showConfirm: (content: string, title?: string) => Promise<boolean>;
}

export const useDialogStore = create<DialogState>((set, get) => ({
  isOpen: false,
  config: null,

  openDialog: (config) => {
    set({ isOpen: true, config });
  },

  closeDialog: () => {
    set({ isOpen: false });
    // 延迟清除配置，等待动画完成
    setTimeout(() => {
      const state = get();
      if (!state.isOpen) {
        set({ config: null });
      }
    }, 300);
  },

  showAlert: (content, title = '提示') => {
    return new Promise<void>((resolve) => {
      set({
        isOpen: true,
        config: {
          type: 'alert',
          title,
          content,
          confirmText: '确定',
          onConfirm: () => {
            get().closeDialog();
            resolve();
          },
        },
      });
    });
  },

  showConfirm: (content, title = '确认') => {
    return new Promise<boolean>((resolve) => {
      set({
        isOpen: true,
        config: {
          type: 'confirm',
          title,
          content,
          confirmText: '确定',
          cancelText: '取消',
          onConfirm: () => {
            get().closeDialog();
            resolve(true);
          },
          onCancel: () => {
            get().closeDialog();
            resolve(false);
          },
        },
      });
    });
  },
}));

/**
 * 全局便捷函数
 */
export const showAlert = (content: string, title?: string) => {
  return useDialogStore.getState().showAlert(content, title);
};

export const showConfirm = (content: string, title?: string) => {
  return useDialogStore.getState().showConfirm(content, title);
};
