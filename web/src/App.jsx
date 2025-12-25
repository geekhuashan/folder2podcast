import { createSignal, createResource, Show, onMount } from 'solid-js';
import PodcastList from './components/PodcastList';
import FileManager from './components/FileManager';
import FloatingTaskWindow from './components/FloatingTaskWindow';
import { Login } from './components/Login';
import { ToastProvider, useToast } from './components/Toast';
import { podcastsAPI, authAPI } from './utils/api';
import { ModalProvider } from './contexts/ModalContext';
import ErrorBoundary from './components/ErrorBoundary';
import ConfirmDialog from './components/ConfirmDialog';

export default function App() {
  // ====== 认证状态 ======
  const [user, setUser] = createSignal(null);
  const [isGuest, setIsGuest] = createSignal(false);
  const [authLoading, setAuthLoading] = createSignal(true);

  // 检查登录状态
  onMount(async () => {
    try {
      const result = await authAPI.getCurrentUser();
      setUser(result.user);
    } catch {
      // 未登录，显示登录页
    } finally {
      setAuthLoading(false);
    }
  });

  // 处理登录成功
  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setIsGuest(false);
  };

  // 处理访客模式
  const handleGuestMode = () => {
    setIsGuest(true);
  };

  // 处理登出
  const handleLogout = async () => {
    await authAPI.logout();
    setUser(null);
    setIsGuest(false);
  };

  // ====== 原有的状态 ======
  const [currentView, setCurrentView] = createSignal('podcasts'); // 'podcasts' | 'download' | 'settings'
  const [selectedPodcast, setSelectedPodcast] = createSignal(null);
  const [showUserMenu, setShowUserMenu] = createSignal(false);

  const [podcasts] = createResource(podcastsAPI.getAll);

  // 刷新播客列表的触发器（用于视频下载完成后高亮）
  const [refetchTrigger, setRefetchTrigger] = createSignal(0);
  const [highlightPodcast, setHighlightPodcast] = createSignal(null);

  const handleSelectPodcast = (podcast) => {
    setSelectedPodcast(podcast);
  };

  const handleBackToList = () => {
    setSelectedPodcast(null);
  };

  // 视频下载完成回调
  const handleDownloadComplete = (podcastName) => {
    setRefetchTrigger(prev => prev + 1);
    setHighlightPodcast(podcastName);
  };

  const getViewTitle = () => {
    if (selectedPodcast()) return selectedPodcast().title;
    if (currentView() === 'settings') return '系统设置';
    return 'Folder2Podcast';
  };

  return (
    <ErrorBoundary>
      <ModalProvider>
        <ToastProvider>
          {/* 加载中状态 */}
          <Show when={authLoading()}>
            <div style={{ display: 'flex', 'justify-content': 'center', 'align-items': 'center', height: '100vh' }}>
              <div class="spinner" />
            </div>
          </Show>

          {/* 未登录且非访客模式 - 显示登录页 */}
          <Show when={!authLoading() && !user() && !isGuest()}>
            <Login onLoginSuccess={handleLoginSuccess} onGuestMode={handleGuestMode} />
          </Show>

          {/* 已登录或访客模式 - 显示主界面 */}
          <Show when={!authLoading() && (user() || isGuest())}>
            <div style={{ display: 'flex', 'flex-direction': 'column', height: '100vh', background: '#f8fafc' }}>
              {/* 顶部导航栏 */}
              <header style={{
                background: 'white',
                'border-bottom': '1px solid #e2e8f0',
                padding: '0 2rem',
                height: '64px',
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'space-between',
                'box-shadow': '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
              }}>
                {/* 左侧：Logo + 导航 */}
                <div style={{ display: 'flex', 'align-items': 'center', gap: '2rem' }}>
                  {/* Logo */}
                  <div style={{ display: 'flex', 'align-items': 'center', gap: '0.75rem' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="#3b82f6"/>
                      <circle cx="12" cy="12" r="3" fill="#3b82f6"/>
                    </svg>
                    <span style={{ 'font-size': '1.25rem', 'font-weight': '700', color: '#1e293b' }}>Folder2Podcast</span>
                  </div>

                  {/* 导航 */}
                  <nav style={{ display: 'flex', gap: '0.5rem' }}>
                    <Show when={!selectedPodcast()}>
                      {/* 播客管理 */}
                      <button
                        class={`nav-tab ${currentView() === 'podcasts' ? 'active' : ''}`}
                        onClick={() => setCurrentView('podcasts')}
                        style={{
                          padding: '0.5rem 1rem',
                          border: 'none',
                          background: currentView() === 'podcasts' ? '#eff6ff' : 'transparent',
                          color: currentView() === 'podcasts' ? '#3b82f6' : '#64748b',
                          'border-radius': '0.5rem',
                          cursor: 'pointer',
                          'font-weight': '500',
                          'font-size': '0.9375rem',
                          transition: 'all 0.2s',
                          display: 'flex',
                          'align-items': 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="2"/>
                          <path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.24a6 6 0 0 1 0-8.49M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14"/>
                        </svg>
                        播客管理
                        <Show when={!podcasts.loading && podcasts()?.data}>
                          <span style={{
                            background: '#3b82f6',
                            color: 'white',
                            padding: '0.125rem 0.5rem',
                            'border-radius': '9999px',
                            'font-size': '0.75rem',
                            'font-weight': '600'
                          }}>
                            {podcasts()?.data?.length || 0}
                          </span>
                        </Show>
                      </button>

                      {/* 设置 */}
                      <button
                        class={`nav-tab ${currentView() === 'settings' ? 'active' : ''}`}
                        onClick={() => setCurrentView('settings')}
                        style={{
                          padding: '0.5rem 1rem',
                          border: 'none',
                          background: currentView() === 'settings' ? '#eff6ff' : 'transparent',
                          color: currentView() === 'settings' ? '#3b82f6' : '#64748b',
                          'border-radius': '0.5rem',
                          cursor: 'pointer',
                          'font-weight': '500',
                          'font-size': '0.9375rem',
                          transition: 'all 0.2s',
                          display: 'flex',
                          'align-items': 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="3"/>
                          <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/>
                        </svg>
                        设置
                      </button>
                    </Show>

                    {/* 显示当前播客时的面包屑 */}
                    <Show when={selectedPodcast()}>
                      <button
                        onClick={handleBackToList}
                        style={{
                          padding: '0.5rem 1rem',
                          border: 'none',
                          background: 'transparent',
                          color: '#64748b',
                          'border-radius': '0.5rem',
                          cursor: 'pointer',
                          'font-weight': '500',
                          'font-size': '0.9375rem',
                          transition: 'all 0.2s',
                          display: 'flex',
                          'align-items': 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M19 12H5M12 19l-7-7 7-7"/>
                        </svg>
                        返回列表
                      </button>
                      <span style={{ color: '#cbd5e1', 'font-size': '1.25rem' }}>/</span>
                      <span style={{ color: '#1e293b', 'font-weight': '600', 'font-size': '0.9375rem' }}>
                        {selectedPodcast().title}
                      </span>
                    </Show>
                  </nav>
                </div>

                {/* 右侧：用户信息 */}
                <div style={{ display: 'flex', 'align-items': 'center', gap: '1rem', position: 'relative' }}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu())}
                    style={{
                      display: 'flex',
                      'align-items': 'center',
                      gap: '0.75rem',
                      padding: '0.5rem 1rem',
                      border: '1px solid #e2e8f0',
                      background: 'white',
                      'border-radius': '0.5rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Show when={user()} fallback={
                      <span style={{ 'font-size': '0.875rem', color: '#64748b' }}>👁️ 访客</span>
                    }>
                      <span style={{ 'font-size': '0.875rem', color: '#1e293b', 'font-weight': '500' }}>
                        👤 {user().nickname || user().username}
                      </span>
                    </Show>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>

                  {/* 下拉菜单 */}
                  <Show when={showUserMenu()}>
                    <div style={{
                      position: 'absolute',
                      top: '3.5rem',
                      right: 0,
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      'border-radius': '0.5rem',
                      'box-shadow': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      padding: '0.5rem',
                      'min-width': '180px',
                      'z-index': 50
                    }}>
                      <div style={{ padding: '0.75rem 1rem', 'border-bottom': '1px solid #e2e8f0' }}>
                        <div style={{ 'font-size': '0.75rem', color: '#64748b', 'margin-bottom': '0.25rem' }}>版本</div>
                        <div style={{ 'font-size': '0.875rem', color: '#1e293b' }}>v2.0.0</div>
                      </div>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          handleLogout();
                        }}
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          border: 'none',
                          background: 'transparent',
                          'text-align': 'left',
                          cursor: 'pointer',
                          color: '#dc2626',
                          'font-weight': '500',
                          'font-size': '0.875rem',
                          'border-radius': '0.375rem',
                          transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#fee2e2'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        {user() ? '登出' : '返回登录'}
                      </button>
                    </div>
                  </Show>
                </div>
              </header>

              {/* 主内容区 */}
              <main style={{
                flex: 1,
                overflow: 'auto',
                padding: '2rem',
                'max-width': '1400px',
                width: '100%',
                margin: '0 auto'
              }}>
            <Show
              when={!selectedPodcast()}
              fallback={
                <FileManager podcast={selectedPodcast()} onBack={handleBackToList} />
              }
            >
              {/* 播客管理页面 */}
              <Show when={currentView() === 'podcasts'}>
                <PodcastList
                  onSelect={handleSelectPodcast}
                  refetchTrigger={refetchTrigger()}
                  highlightPodcast={highlightPodcast()}
                  isGuest={isGuest()}
                />
              </Show>

              {/* 设置页面 */}
              <Show when={currentView() === 'settings'}>
                <div class="content-wrapper">
                  <section class="section-card">
                    <div class="section-header">
                      <div>
                        <p class="eyebrow">Configuration</p>
                        <h2>系统设置</h2>
                        <p class="text-muted">配置服务器参数和默认行为</p>
                      </div>
                    </div>
                    <div class="form-grid">
                      <div>
                        <div class="field-label">音频目录</div>
                        <input class="input" value={import.meta.env.VITE_AUDIO_DIR || '/data/podcasts'} disabled />
                      </div>
                      <div>
                        <div class="field-label">服务器地址</div>
                        <input class="input" value={window.location.origin} disabled />
                      </div>
                    </div>
                  </section>
                </div>
              </Show>
            </Show>
          </main>

          <FloatingTaskWindow />
        </div>
      </Show>

      {/* 全局确认对话框 */}
      <ConfirmDialog />
    </ToastProvider>
      </ModalProvider>
    </ErrorBoundary>
  );
}
