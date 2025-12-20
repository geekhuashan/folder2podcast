import { createSignal, createResource, Show } from 'solid-js';
import PodcastList from './components/PodcastList';
import FileManager from './components/FileManager';
import FloatingTaskWindow from './components/FloatingTaskWindow';
import BilibiliDownload from './components/BilibiliDownload';
import { ToastProvider } from './components/Toast';
import { podcastsAPI } from './utils/api';

function VideoDownloadPanel() {
  const [podcasts, { refetch }] = createResource(podcastsAPI.getAll);

  return (
    <Show
      when={!podcasts.loading}
      fallback={
        <section class="section-card" style={{ 'text-align': 'center' }}>
          <div class="spinner" style={{ margin: '1rem auto' }} />
          <p class="text-sm">正在加载播客列表...</p>
        </section>
      }
    >
      <BilibiliDownload
        podcasts={podcasts()?.data || []}
        onTaskAdded={() => setTimeout(() => refetch(), 2000)}
      />
    </Show>
  );
}

export default function App() {
  const [currentView, setCurrentView] = createSignal('download'); // 'download' | 'podcasts' | 'settings'
  const [sidebarOpen, setSidebarOpen] = createSignal(true);
  const [selectedPodcast, setSelectedPodcast] = createSignal(null);
  const [view, setView] = createSignal('list'); // 'list' or 'files'

  const [podcasts] = createResource(podcastsAPI.getAll);

  const handleSelectPodcast = (podcast) => {
    setSelectedPodcast(podcast);
    setView('files');
  };

  const handleBack = () => {
    setView('list');
    setSelectedPodcast(null);
  };

  const getViewTitle = () => {
    if (currentView() === 'podcasts' && view() === 'files' && selectedPodcast()) {
      return selectedPodcast().title;
    }
    if (currentView() === 'download') return '视频下载';
    if (currentView() === 'podcasts') return '播客管理';
    return '设置';
  };

  const getViewDescription = () => {
    if (currentView() === 'podcasts' && view() === 'files' && selectedPodcast()) {
      return `管理 ${selectedPodcast().dirName} 的音频文件和配置`;
    }
    if (currentView() === 'download') return '从各大视频平台下载并转换为音频';
    if (currentView() === 'podcasts') return '管理你的播客和音频文件';
    return '配置系统参数和偏好设置';
  };

  return (
    <ToastProvider>
      <div class="app-layout">
        {/* 侧边栏 */}
        <aside class={`sidebar ${sidebarOpen() ? '' : 'sidebar--collapsed'}`}>
          {/* Logo */}
          <div class="sidebar__header">
            <div class="sidebar__logo">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="currentColor"/>
                <circle cx="12" cy="12" r="3" fill="currentColor"/>
              </svg>
              <span>Folder2Podcast</span>
            </div>
            <p class="sidebar__subtitle">播客管理控制台</p>
          </div>

          {/* 导航 */}
          <nav class="sidebar__nav">
            <button
              class={`nav-item ${currentView() === 'download' ? 'nav-item--active' : ''}`}
              onClick={() => setCurrentView('download')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
              <span>视频下载</span>
            </button>

            <button
              class={`nav-item ${currentView() === 'podcasts' ? 'nav-item--active' : ''}`}
              onClick={() => {
                setCurrentView('podcasts');
                setView('list');
                setSelectedPodcast(null);
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="2"/>
                <path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.24a6 6 0 0 1 0-8.49M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14"/>
              </svg>
              <span>播客管理</span>
              <Show when={!podcasts.loading && podcasts()?.data}>
                <span class="nav-badge">{podcasts()?.data?.length || 0}</span>
              </Show>
            </button>

            <button
              class={`nav-item ${currentView() === 'settings' ? 'nav-item--active' : ''}`}
              onClick={() => setCurrentView('settings')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/>
              </svg>
              <span>设置</span>
            </button>
          </nav>

          {/* 底部信息 */}
          <div class="sidebar__footer">
            <div class="sidebar__info">
              <div>版本: v2.0.0</div>
            </div>
          </div>
        </aside>

        {/* 主内容区 */}
        <div class="main-content">
          {/* 顶栏 */}
          <header class="topbar">
            <button
              class="topbar__toggle"
              onClick={() => setSidebarOpen(!sidebarOpen())}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <Show when={sidebarOpen()} fallback={
                  <>
                    <line x1="3" y1="12" x2="21" y2="12"/>
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <line x1="3" y1="18" x2="21" y2="18"/>
                  </>
                }>
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </Show>
              </svg>
            </button>
            <div class="topbar__title">
              <h2>{getViewTitle()}</h2>
              <p>{getViewDescription()}</p>
            </div>
          </header>

          {/* 内容区域 */}
          <main class="content-area">
            <Show when={currentView() === 'download'}>
              <div class="content-wrapper">
                <VideoDownloadPanel />
              </div>
            </Show>

            <Show when={currentView() === 'podcasts'}>
              <Show
                when={view() === 'files' && selectedPodcast()}
                fallback={<PodcastList onSelect={handleSelectPodcast} />}
              >
                <FileManager podcast={selectedPodcast()} onBack={handleBack} />
              </Show>
            </Show>

            <Show when={currentView() === 'settings'}>
              <div class="content-wrapper">
                <section class="section-card">
                  <div class="section-header">
                    <div>
                      <p class="eyebrow">Configuration</p>
                      <h2>系统设置</h2>
                      <p>配置服务器参数和默认行为</p>
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
          </main>
        </div>

        <FloatingTaskWindow />
      </div>
    </ToastProvider>
  );
}
