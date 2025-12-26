/**
 * 登录组件
 *
 * 说明：
 * - 提供用户名密码登录
 * - 可作为模态框显示
 * - 默认填充 admin 用户名
 */

import { createSignal, Show } from 'solid-js';
import { authAPI } from '../utils/api';
import './Login.css';

export function Login(props) {
  const [username, setUsername] = createSignal('admin');
  const [password, setPassword] = createSignal('');
  const [error, setError] = createSignal('');
  const [loading, setLoading] = createSignal(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await authAPI.login(username(), password());
      props.onLoginSuccess(result.user);
    } catch (err) {
      setError(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="login-card">
      {/* 关闭按钮（仅在模态框模式显示） */}
      <Show when={props.onClose}>
        <button
          onClick={() => props.onClose?.()}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'transparent',
            border: 'none',
            'font-size': '1.5rem',
            cursor: 'pointer',
            color: '#94a3b8',
            padding: '0.25rem',
            'line-height': 1
          }}
        >
          ×
        </button>
      </Show>

      <h1 class="login-title">Folder2Podcast</h1>
      <p class="login-subtitle">登录以管理你的播客</p>

      <form onSubmit={handleLogin} class="login-form">
        <div class="form-group">
          <label for="username">用户名</label>
          <input
            id="username"
            type="text"
            placeholder="请输入用户名"
            value={username()}
            onInput={(e) => setUsername(e.target.value)}
            disabled={loading()}
            required
          />
        </div>

        <div class="form-group">
          <label for="password">密码</label>
          <input
            id="password"
            type="password"
            placeholder="请输入密码"
            value={password()}
            onInput={(e) => setPassword(e.target.value)}
            disabled={loading()}
            required
          />
        </div>

        {error() && <p class="error-message">{error()}</p>}

        <button type="submit" class="btn-login" disabled={loading()}>
          {loading() ? '登录中...' : '登录'}
        </button>
      </form>

      <p class="login-hint">默认账号：admin / admin</p>
    </div>
  );
}
