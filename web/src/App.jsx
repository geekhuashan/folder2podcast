import { createSignal, createResource, Show } from 'solid-js';
import PodcastList from './components/PodcastList';
import FileManager from './components/FileManager';
import FloatingTaskWindow from './components/FloatingTaskWindow';
import BilibiliDownload from './components/BilibiliDownload';
import { ToastProvider, useToast } from './components/Toast';
import { podcastsAPI } from './utils/api';

// 首页组件 - 展示两种创建播客的方式
function HomePage(props) {
  const [selectedMethod, setSelectedMethod] = createSignal(null);
  const toast = useToast();
  let uploadInputRef;

  // 处理文件夹上传
  const handleFolderUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    // 从第一个文件的路径中提取文件夹名称
    const firstFile = files[0];
    const pathParts = firstFile.webkitRelativePath.split('/');
    const folderName = pathParts[0];

    if (!folderName) {
      toast.error('无法获取文件夹名称');
      return;
    }

    // 过滤出音频文件
    const audioExtensions = ['.mp3', '.m4a', '.wav', '.aac', '.ogg', '.flac', '.wma'];
    const audioFiles = files.filter(file => {
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      return audioExtensions.includes(ext);
    });

    if (audioFiles.length === 0) {
      toast.warning('所选文件夹中没有音频文件');
      return;
    }

    try {
      setSelectedMethod('upload');

      // 1. 使用文件夹名称自动生成播客目录名
      const dirName = folderName
        .toLowerCase()
        .replace(/[\s]+/g, '-')
        .replace(/[^\w\u4e00-\u9fa5-]/g, '')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50);

      // 2. 创建播客
      toast.info(`正在创建播客"${folderName}"...`);
      await podcastsAPI.create({
        dirName: dirName,
        metadata: {
          title: folderName,
          description: `从文件夹"${folderName}"上传的播客`,
          language: 'zh-cn',
          category: 'Podcast',
          explicit: false
        }
      });

      toast.success(`播客创建成功，开始上传 ${audioFiles.length} 个音频文件`);

      // 3. 导入上传管理器
      const { addUploadTask, markTaskUploading, updateTaskProgress, markTaskCompleted, markTaskFailed } =
        await import('./utils/uploadManager');

      // 4. 创建上传任务并开始上传
      for (const file of audioFiles) {
        const taskId = addUploadTask(file, dirName);

        try {
          markTaskUploading(taskId);

          await podcastsAPI.uploadFileWithProgress(
            dirName,
            file,
            (loaded, total, percent) => {
              updateTaskProgress(taskId, percent);
            }
          );

          markTaskCompleted(taskId);
        } catch (error) {
          markTaskFailed(taskId, error.message);
        }
      }

      // 5. 导航到播客管理页面
      toast.success('所有文件上传完成！');
      setTimeout(() => {
        props.onNavigate('podcasts');
      }, 1000);

    } catch (error) {
      toast.error(`创建播客失败: ${error.message}`);
    } finally {
      // 重置 input
      event.target.value = '';
      setSelectedMethod(null);
    }
  };

  const handleSelectUpload = () => {
    // 触发文件夹选择
    uploadInputRef?.click();
  };

  const handleSelectDownload = () => {
    setSelectedMethod('download');
    setTimeout(() => props.onNavigate('download'), 300);
  };

  return (
    <div class="home-page">
      {/* 隐藏的文件夹选择 input */}
      <input
        ref={uploadInputRef}
        type="file"
        webkitdirectory=""
        directory=""
        multiple
        style={{ display: 'none' }}
        onChange={handleFolderUpload}
        accept="audio/*"
      />

      {/* 标题区 */}
      <div class="home-page__header">
        <h2 class="home-page__title">创建你的播客</h2>
        <p class="home-page__subtitle">
          选择一种方式开始：上传本地音频文件，或从视频平台自动提取音频
        </p>
      </div>

      {/* 两种方式 - 大卡片布局 */}
      <div class="home-page__cards">
        {/* 方式1：上传本地文件 */}
        <button
          onClick={handleSelectUpload}
          class={`method-card ${selectedMethod() === 'upload' ? 'method-card--selected-green' : ''}`}
        >
          {/* 角标 */}
          <div class="method-card__badge">
            <div class={`method-card__badge-icon ${selectedMethod() === 'upload' ? 'method-card__badge-icon--green' : ''}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
            </div>
          </div>

          {/* 图标区 */}
          <div class={`method-card__icon-wrapper ${selectedMethod() === 'upload' ? 'method-card__icon-wrapper--green' : ''}`}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="method-card__icon">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          </div>

          {/* 内容 */}
          <h3 class="method-card__title">上传音频文件夹</h3>
          <p class="method-card__description">
            将本地的音频文件夹上传到服务器，自动生成 RSS 订阅源。适合已有音频资源的用户。
          </p>

          {/* 特性列表 */}
          <ul class="method-card__features">
            <li class="method-card__feature">
              <div class={`method-card__dot ${selectedMethod() === 'upload' ? 'method-card__dot--green' : ''}`}></div>
              支持 MP3、M4A、WAV 等格式
            </li>
            <li class="method-card__feature">
              <div class={`method-card__dot ${selectedMethod() === 'upload' ? 'method-card__dot--green' : ''}`}></div>
              自动识别封面和元数据
            </li>
            <li class="method-card__feature">
              <div class={`method-card__dot ${selectedMethod() === 'upload' ? 'method-card__dot--green' : ''}`}></div>
              零配置即可使用
            </li>
          </ul>

          {/* 按钮 */}
          <div class={`method-card__cta ${selectedMethod() === 'upload' ? 'method-card__cta--green' : ''}`}>
            选择此方式
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
        </button>

        {/* 方式2：视频下载 */}
        <button
          onClick={handleSelectDownload}
          class={`method-card ${selectedMethod() === 'download' ? 'method-card--selected-blue' : ''}`}
        >
          {/* 角标 */}
          <div class="method-card__badge">
            <div class={`method-card__badge-icon ${selectedMethod() === 'download' ? 'method-card__badge-icon--blue' : ''}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
            </div>
          </div>

          {/* 图标区 */}
          <div class={`method-card__icon-wrapper ${selectedMethod() === 'download' ? 'method-card__icon-wrapper--blue' : ''}`}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="method-card__icon">
              <polygon points="23 7 16 12 23 17 23 7"/>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
          </div>

          {/* 内容 */}
          <h3 class="method-card__title">从视频提取音频</h3>
          <p class="method-card__description">
            粘贴视频链接，自动下载并提取音频。支持 B 站、抖音、YouTube 等主流平台。
          </p>

          {/* 特性列表 */}
          <ul class="method-card__features">
            <li class="method-card__feature">
              <div class={`method-card__dot ${selectedMethod() === 'download' ? 'method-card__dot--blue' : ''}`}></div>
              支持多个视频平台
            </li>
            <li class="method-card__feature">
              <div class={`method-card__dot ${selectedMethod() === 'download' ? 'method-card__dot--blue' : ''}`}></div>
              自动提取高质量音频
            </li>
            <li class="method-card__feature">
              <div class={`method-card__dot ${selectedMethod() === 'download' ? 'method-card__dot--blue' : ''}`}></div>
              支持批量下载队列
            </li>
          </ul>

          {/* 按钮 */}
          <div class={`method-card__cta ${selectedMethod() === 'download' ? 'method-card__cta--blue' : ''}`}>
            选择此方式
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
        </button>
      </div>

      {/* 分隔线 */}
      <div class="home-page__divider">
        <div class="home-page__divider-line"></div>
        <span class="home-page__divider-text">或者</span>
        <div class="home-page__divider-line"></div>
      </div>

      {/* 快捷操作 */}
      <div class="home-page__quick-action">
        <p class="home-page__quick-text">已有播客？</p>
        <button
          onClick={() => props.onNavigate('podcasts')}
          class="home-page__quick-btn"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="2"/>
            <path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.24a6 6 0 0 1 0-8.49M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14"/>
          </svg>
          查看我的播客列表
        </button>
      </div>

      {/* 底部说明 */}
      <footer class="home-page__footer">
        <div class="home-page__footer-item">
          <h4 class="home-page__footer-title">零配置</h4>
          <p class="home-page__footer-desc">无需复杂设置，上传即用</p>
        </div>
        <div class="home-page__footer-item">
          <h4 class="home-page__footer-title">自动化</h4>
          <p class="home-page__footer-desc">自动生成 RSS，实时更新</p>
        </div>
        <div class="home-page__footer-item">
          <h4 class="home-page__footer-title">兼容性</h4>
          <p class="home-page__footer-desc">支持所有主流播客客户端</p>
        </div>
      </footer>
    </div>
  );
}

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
  const [currentView, setCurrentView] = createSignal('home'); // 'home' | 'download' | 'podcasts' | 'settings'
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
    if (currentView() === 'home') return '欢迎使用 Folder2Podcast';
    if (currentView() === 'podcasts' && view() === 'files' && selectedPodcast()) {
      return selectedPodcast().title;
    }
    if (currentView() === 'download') return '视频下载';
    if (currentView() === 'podcasts') return '播客管理';
    return '设置';
  };

  const getViewDescription = () => {
    if (currentView() === 'home') return '选择一种方式开始创建你的播客内容';
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
              class={`nav-item ${currentView() === 'home' ? 'nav-item--active' : ''}`}
              onClick={() => setCurrentView('home')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <span>首页</span>
            </button>

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
            <Show when={currentView() === 'home'}>
              <HomePage onNavigate={setCurrentView} />
            </Show>

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
