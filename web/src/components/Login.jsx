/**
 * 登录组件
 *
 * 说明：
 * - 提供用户名密码登录
 * - 支持访客模式（只读浏览）
 * - 默认填充 admin 用户名
 */

import { createSignal } from 'solid-js';
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
    <div class="login-container">
      <div class="login-card">
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

        <div class="login-divider">或者</div>

        <button class="btn-guest" onClick={() => props.onGuestMode?.()}>
          以访客身份浏览（只读）
        </button>

        <p class="login-hint">默认账号：admin / admin</p>
      </div>
    </div>
  );
}
