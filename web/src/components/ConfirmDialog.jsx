/**
 * 通用确认对话框
 *
 * 替换所有原生 confirm() 调用，提供统一且美观的确认交互
 *
 * 使用示例：
 * ```jsx
 * const modal = useModal();
 *
 * modal.open('confirm', {
 *   title: '确认删除',
 *   message: '确定要删除这个文件吗？此操作无法撤销。',
 *   confirmText: '删除',
 *   cancelText: '取消',
 *   danger: true,
 *   onConfirm: () => handleDelete(),
 * });
 * ```
 */

import { createSignal, Show } from 'solid-js';
import { useModal } from '../contexts/ModalContext';

export default function ConfirmDialog() {
  const modal = useModal();
  const [isProcessing, setIsProcessing] = createSignal(false);

  // 获取模态框数据
  const data = () => modal.modalData() || {};

  const handleConfirm = async () => {
    const { onConfirm } = data();
    if (!onConfirm) {
      modal.close();
      return;
    }

    setIsProcessing(true);
    try {
      await onConfirm();
      modal.close();
    } catch (error) {
      console.error('确认操作失败:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    const { onCancel } = data();
    if (onCancel) {
      onCancel();
    }
    modal.close();
  };

  return (
    <Show when={modal.isOpen('confirm')}>
      <div class="modal-overlay" onClick={handleCancel}>
        <div
          class="modal modal--small"
          onClick={(e) => e.stopPropagation()}
          style={{
            'max-height': '90vh',
            'overflow-y': 'auto',
            display: 'flex',
            'flex-direction': 'column'
          }}
        >
          <div style={{ padding: '1.5rem', flex: 1 }}>
            {/* 图标和标题 */}
            <div style={{ 'margin-bottom': '1.5rem', 'text-align': 'center' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  'border-radius': '50%',
                  background: data().danger ? '#fee2e2' : '#e0f2fe',
                  color: data().danger ? '#dc2626' : '#0284c7',
                  display: 'flex',
                  'align-items': 'center',
                  'justify-content': 'center',
                  margin: '0 auto 1rem',
                  'font-size': '24px',
                }}
              >
                {data().danger ? '⚠' : '?'}
              </div>
              <h2 style={{ 'font-size': '1.25rem', 'font-weight': '700', margin: '0 0 0.5rem' }}>
                {data().title || '确认操作'}
              </h2>
              <Show when={data().message}>
                <p style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
                  {data().message}
                </p>
              </Show>
            </div>

            {/* 详细信息（可选） */}
            <Show when={data().details}>
              <div
                style={{
                  background: 'var(--surface-soft)',
                  padding: '1rem',
                  'border-radius': 'var(--radius-sm)',
                  'margin-bottom': '1.5rem',
                  border: '1px solid var(--border)',
                }}
              >
                {data().details}
              </div>
            </Show>

            {/* 按钮 - 固定在底部 */}
            <div style={{ display: 'flex', gap: '0.75rem', 'margin-top': 'auto' }}>
              <button
                type="button"
                class="btn btn-secondary"
                onClick={handleCancel}
                disabled={isProcessing()}
                style={{ flex: 1 }}
              >
                {data().cancelText || '取消'}
              </button>
              <button
                type="button"
                class="btn"
                onClick={handleConfirm}
                disabled={isProcessing()}
                style={{
                  flex: 1,
                  background: data().danger ? '#dc2626' : 'var(--accent)',
                  color: 'white',
                }}
              >
                {isProcessing() ? '处理中...' : (data().confirmText || '确认')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
}
