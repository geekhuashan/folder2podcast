import { createSignal, createContext, useContext, For, onCleanup } from 'solid-js';

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
      top: '1.5rem',
      right: '1.5rem',
      'z-index': 9999,
      display: 'flex',
      'flex-direction': 'column',
      gap: '0.75rem',
      'max-width': '420px',
      'pointer-events': 'none'
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
  const [progress, setProgress] = createSignal(100);
  let progressInterval;

  // 入场动画
  setTimeout(() => setShow(true), 10);

  // 进度条动画
  if (props.toast.duration > 0) {
    const startTime = Date.now();
    progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / props.toast.duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(progressInterval);
      }
    }, 16);

    onCleanup(() => clearInterval(progressInterval));
  }

  const handleRemove = () => {
    setShow(false);
    if (progressInterval) clearInterval(progressInterval);
    setTimeout(() => props.onRemove(props.toast.id), 300);
  };

  const getConfig = () => {
    const configs = {
      success: {
        bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        )
      },
      error: {
        bg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        )
      },
      warning: {
        bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        )
      },
      info: {
        bg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        )
      }
    };
    return configs[props.toast.type] || configs.info;
  };

  const config = getConfig();

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        'align-items': 'flex-start',
        gap: '0.875rem',
        padding: '1rem 1.25rem',
        'border-radius': '12px',
        background: config.bg,
        color: 'white',
        'box-shadow': '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.15)',
        'font-size': '0.9375rem',
        'font-weight': '500',
        'line-height': '1.5',
        'min-width': '320px',
        'max-width': '420px',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: show()
          ? 'translateX(0) scale(1)'
          : 'translateX(400px) scale(0.95)',
        opacity: show() ? 1 : 0,
        'pointer-events': 'auto',
        overflow: 'hidden',
        'backdrop-filter': 'blur(10px)'
      }}
      onClick={handleRemove}
    >
      {/* 图标 */}
      <div style={{
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'center',
        width: '2.25rem',
        height: '2.25rem',
        'border-radius': '10px',
        background: 'rgba(255, 255, 255, 0.2)',
        'flex-shrink': 0,
        'backdrop-filter': 'blur(10px)'
      }}>
        {config.icon}
      </div>

      {/* 内容 */}
      <div style={{ flex: 1, 'padding-top': '0.125rem' }}>
        {props.toast.message}
      </div>

      {/* 关闭按钮 */}
      <button
        style={{
          position: 'absolute',
          top: '0.5rem',
          right: '0.5rem',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          width: '1.5rem',
          height: '1.5rem',
          'border-radius': '6px',
          background: 'rgba(255, 255, 255, 0.15)',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          'font-size': '1.125rem',
          'line-height': 1,
          'flex-shrink': 0,
          transition: 'background 0.2s ease',
          'backdrop-filter': 'blur(10px)'
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleRemove();
        }}
        onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.25)'}
        onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.15)'}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      {/* 进度条 */}
      {props.toast.duration > 0 && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'rgba(255, 255, 255, 0.2)',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            background: 'rgba(255, 255, 255, 0.5)',
            width: `${progress()}%`,
            transition: 'width 0.016s linear',
            'box-shadow': '0 0 10px rgba(255, 255, 255, 0.5)'
          }} />
        </div>
      )}
    </div>
  );
}
