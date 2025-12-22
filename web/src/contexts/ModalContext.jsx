/**
 * 全局模态框管理器
 *
 * 功能：
 * - 确保同时只有一个模态框打开
 * - 统一管理模态框的打开/关闭状态
 * - 提供便捷的 API 供组件使用
 *
 * 使用示例：
 * ```jsx
 * const modal = useModal();
 * modal.open('confirmDelete', { message: '确定删除？', onConfirm: handleDelete });
 * modal.close();
 * ```
 */

import { createContext, useContext, createSignal } from 'solid-js';

// 创建 Context
const ModalContext = createContext();

/**
 * Modal Provider
 * 包裹整个应用的根组件
 */
export function ModalProvider(props) {
  // 当前打开的模态框 ID
  const [currentModal, setCurrentModal] = createSignal(null);

  // 模态框数据（传递给模态框的 props）
  const [modalData, setModalData] = createSignal(null);

  /**
   * 打开模态框
   * @param {string} modalId - 模态框唯一标识符
   * @param {object} data - 传递给模态框的数据
   */
  const open = (modalId, data = {}) => {
    setCurrentModal(modalId);
    setModalData(data);
  };

  /**
   * 关闭当前模态框
   */
  const close = () => {
    setCurrentModal(null);
    setModalData(null);
  };

  /**
   * 检查特定模态框是否打开
   * @param {string} modalId - 模态框 ID
   * @returns {boolean}
   */
  const isOpen = (modalId) => {
    return currentModal() === modalId;
  };

  const value = {
    currentModal,
    modalData,
    open,
    close,
    isOpen,
  };

  return (
    <ModalContext.Provider value={value}>
      {props.children}
    </ModalContext.Provider>
  );
}

/**
 * Hook: 使用模态框
 * 在任何子组件中调用此 hook 获取模态框管理功能
 */
export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal 必须在 ModalProvider 内部使用');
  }
  return context;
}
