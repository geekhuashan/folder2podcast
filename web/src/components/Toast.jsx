import { createSignal, createContext, useContext, For, Show } from 'solid-js';

// Toast 上下文
const ToastContext = createContext();

export function ToastProvider(props) {
  const [toasts, setToasts] = createSignal([]);
  let idCounter = 0;

  const addToast = (message, type = 'info', duration = 3000) => {
    const id = ++idCounter;
    setToasts(prev => [...prev, { id, message, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const toast = {
    success: (message, duration) => addToast(message, 'success', duration),
    error: (message, duration) => addToast(message, 'error', duration),
    warning: (message, duration) => addToast(message, 'warning', duration),
    info: (message, duration) => addToast(message, 'info', duration),
  };

  return (
    <ToastContext.Provider value={toast}>
      {props.children}
      <ToastContainer toasts={toasts()} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

// Toast 容器组件
function ToastContainer(props) {
  return (
    <div style={{
      position: 'fixed',
      top: '1rem',
      right: '1rem',
      'z-index': 9999,
      display: 'flex',
      'flex-direction': 'column',
      gap: '0.75rem',
      'max-width': '400px'
    }}>
      <For each={props.toasts}>
        {(toast) => <ToastItem toast={toast} onRemove={props.onRemove} />}
      </For>
    </div>
  );
}

// 单个 Toast 组件
function ToastItem(props) {
  const [show, setShow] = createSignal(false);

  // 入场动画
  setTimeout(() => setShow(true), 10);

  const handleRemove = () => {
    setShow(false);
    setTimeout(() => props.onRemove(props.toast.id), 300);
  };

  const getStyles = () => {
    const baseStyles = {
      display: 'flex',
      'align-items': 'center',
      gap: '0.75rem',
      padding: '1rem 1.25rem',
      'border-radius': '0.5rem',
      'box-shadow': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      'font-size': '0.875rem',
      'font-weight': '500',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      transform: show() ? 'translateX(0)' : 'translateX(400px)',
      opacity: show() ? 1 : 0,
      'min-width': '300px',
      'max-width': '400px'
    };

    const typeStyles = {
      success: {
        background: '#10b981',
        color: 'white'
      },
      error: {
        background: '#ef4444',
        color: 'white'
      },
      warning: {
        background: '#f59e0b',
        color: 'white'
      },
      info: {
        background: '#3b82f6',
        color: 'white'
      }
    };

    return { ...baseStyles, ...typeStyles[props.toast.type] };
  };

  const getIcon = () => {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[props.toast.type] || icons.info;
  };

  return (
    <div style={getStyles()} onClick={handleRemove}>
      <span style={{
        display: 'inline-flex',
        'align-items': 'center',
        'justify-content': 'center',
        width: '1.5rem',
        height: '1.5rem',
        'border-radius': '50%',
        background: 'rgba(255, 255, 255, 0.3)',
        'font-weight': '700',
        'flex-shrink': 0
      }}>
        {getIcon()}
      </span>
      <span style={{ flex: 1 }}>{props.toast.message}</span>
      <button
        style={{
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          padding: '0.25rem',
          opacity: 0.7,
          'font-size': '1.25rem',
          'line-height': 1,
          'flex-shrink': 0
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleRemove();
        }}
      >
        ×
      </button>
    </div>
  );
}
