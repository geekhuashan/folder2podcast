/**
 * 错误边界组件
 *
 * 捕获子组件树中的 JavaScript 错误，记录错误并显示降级 UI
 * 防止整个应用崩溃
 */

import { createSignal, onError } from 'solid-js';

export default function ErrorBoundary(props) {
  const [error, setError] = createSignal(null);

  onError((err) => {
    console.error('ErrorBoundary 捕获到错误:', err);
    setError(err);
  });

  const handleReset = () => {
    setError(null);
    window.location.reload();
  };

  return (
    <>
      {error() ? (
        <div style={{
          display: 'flex',
          'flex-direction': 'column',
          'align-items': 'center',
          'justify-content': 'center',
          'min-height': '100vh',
          padding: '2rem',
          'text-align': 'center',
          background: 'var(--background)',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            'border-radius': '50%',
            background: '#fee2e2',
            color: '#dc2626',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            'font-size': '32px',
            'margin-bottom': '1.5rem',
          }}>
            ⚠
          </div>
          <h1 style={{
            'font-size': '1.5rem',
            'font-weight': '700',
            margin: '0 0 0.5rem',
            color: 'var(--text)',
          }}>
            应用遇到了错误
          </h1>
          <p style={{
            'font-size': '0.875rem',
            color: 'var(--text-muted)',
            'max-width': '500px',
            margin: '0 0 2rem',
          }}>
            很抱歉，应用遇到了意外错误。您可以尝试刷新页面，或联系技术支持。
          </p>
          <details style={{
            'max-width': '600px',
            'margin-bottom': '2rem',
            'text-align': 'left',
          }}>
            <summary style={{
              cursor: 'pointer',
              'font-size': '0.875rem',
              color: 'var(--primary)',
              'margin-bottom': '0.5rem',
            }}>
              查看错误详情
            </summary>
            <pre style={{
              background: 'var(--surface-soft)',
              padding: '1rem',
              'border-radius': 'var(--radius-sm)',
              'font-size': '0.75rem',
              overflow: 'auto',
              border: '1px solid var(--border)',
            }}>
              {error()?.toString()}
              {'\n\n'}
              {error()?.stack}
            </pre>
          </details>
          <button
            class="btn btn-primary"
            onClick={handleReset}
          >
            刷新页面
          </button>
        </div>
      ) : (
        props.children
      )}
    </>
  );
}
