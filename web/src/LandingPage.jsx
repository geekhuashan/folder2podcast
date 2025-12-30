import { createSignal, onMount } from 'solid-js';

const featureCards = [
  {
    title: '私有 RSS 订阅',
    desc: '把本地音频变成私人播客，Apple Podcast、Pocket Casts 等客户端都能订阅。'
  },
  {
    title: '文件夹极速导入',
    desc: '整包上传，自动生成播客与剧集，元数据可随时微调。'
  },
  {
    title: 'B 站视频转音频',
    desc: '粘贴链接即可下载并生成剧集，后台任务自动处理。'
  },
  {
    title: '存储可控',
    desc: '本地磁盘或 S3 对象存储自由切换，数据只在你的服务器上。'
  },
  {
    title: '多用户隔离',
    desc: '每个账号拥有独立播客空间，权限清晰，内容私密。'
  },
  {
    title: 'RSS 实时更新',
    desc: '标题、封面、发布时间修改后即时生效。'
  }
];

const scenarios = [
  {
    title: '本地音乐播放列表',
    desc: '把硬盘里的音乐打包成播客，开车时像电台一样随听。'
  },
  {
    title: '有声书分集管理',
    desc: '每一本书一个播客，章节顺序可控，离线缓存更方便。'
  },
  {
    title: '会议与访谈归档',
    desc: '录音整理成剧集，时间轴清晰，随时回放。'
  }
];

const stack = [
  'Fastify + TypeScript',
  'SolidJS + Vite',
  'SQLite + Drizzle ORM',
  'RSS 2.0 + iTunes 扩展',
  'Local / S3 Storage'
];

const previewTracks = [
  {
    title: '盗墓笔记 · 试播集',
    meta: '35:42 · 2024/09/01',
    url: 'preview/daomubiji.mp3'
  },
  {
    title: '周杰伦 · 无与伦比演唱会',
    meta: '52:18 · 2024/09/01',
    url: 'preview/jay-live.mp3'
  },
  {
    title: '罗永浩相声 · 精选',
    meta: '41:06 · 2024/09/01',
    url: 'preview/luoyonghao.mp3'
  }
];

export default function LandingPage() {
  const [config, setConfig] = createSignal({
    baseUrl: window.location.origin,
    webBaseUrl: window.location.origin,
    webAppUrl: '/app.html',
    webLandingUrl: '/about.html',
    feedBaseUrl: `${window.location.origin}/feeds`,
  });

  onMount(async () => {
    try {
      const response = await fetch('/api/config');
      if (!response.ok) return;
      const payload = await response.json();
      const nextConfig = payload?.data || payload;
      if (nextConfig?.baseUrl && nextConfig?.webAppUrl && nextConfig?.feedBaseUrl) {
        setConfig(nextConfig);
      }
    } catch (error) {
      console.warn('[Landing] Failed to load config', error);
    }
  });

  const appUrl = () => config().webAppUrl;
  const feedSampleUrl = () => `${config().feedBaseUrl}/xxxx`;

  const [currentTrack, setCurrentTrack] = createSignal(previewTracks[0]);
  let audioRef;

  const handlePlay = (track) => {
    setCurrentTrack(track);
    if (audioRef) {
      audioRef.load();
      audioRef.play();
    }
  };

  return (
    <div class="landing">
      <header class="nav">
        <div class="logo">
          <div class="logo-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div class="logo-text">
            <strong>Folder2Podcast</strong>
            <small>私人播客生成器</small>
          </div>
        </div>
        <nav class="nav-links">
          <a href="#features">核心优势</a>
          <a href="#workflow">三步上手</a>
          <a href="#scenarios">适用场景</a>
          <a href="#security">安全可控</a>
          <a href="#stack">技术栈</a>
        </nav>
        <div class="nav-actions">
          <a class="ghost" href="https://github.com/yaotutu/folder2podcast" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a class="primary" href={appUrl()}>
            打开控制台
          </a>
        </div>
      </header>

      <main>
        <section class="hero">
          <div class="hero-content">
            <div class="badge reveal" style="--delay: 0ms">
              自托管 · RSS · 私密可控
            </div>
            <h1 class="reveal" style="--delay: 90ms">
              把任何音频文件夹
              <br />
              变成你的私人播客
            </h1>
            <p class="reveal" style="--delay: 160ms">
              上传本地音频或粘贴视频链接，自动生成 RSS，在任意播客客户端订阅收听。
              数据完全在你的服务器上，既安全又自由。
            </p>
            <div class="hero-actions reveal" style="--delay: 220ms">
              <a class="primary" href={appUrl()}>立即开始</a>
              <a class="secondary" href="#workflow">了解流程</a>
            </div>
            <div class="hero-meta reveal" style="--delay: 300ms">
              <div>
                <strong>文件夹上传</strong>
                <span>批量导入剧集</span>
              </div>
              <div>
                <strong>RSS 即时同步</strong>
                <span>修改立刻生效</span>
              </div>
              <div>
                <strong>存储可选</strong>
                <span>本地 / S3</span>
              </div>
            </div>
          </div>
          <div class="hero-card reveal" style="--delay: 260ms">
            <div class="hero-card-top">
              <div>
                <p>最新剧集</p>
                <h3>晚间学习电台</h3>
              </div>
              <span class="pill">RSS Ready</span>
            </div>
            <div class="episode-list">
              {previewTracks.map((track) => (
                <div class="episode">
                  <div>
                    <strong>{track.title}</strong>
                    <span>{track.meta}</span>
                  </div>
                  <button onClick={() => handlePlay(track)}>试听</button>
                </div>
              ))}
            </div>
            <div class="hero-player">
              <span>正在试听：{currentTrack().title}</span>
              <audio
                controls
                preload="none"
                ref={(el) => {
                  audioRef = el;
                }}
              >
                <source src={currentTrack().url} type="audio/mpeg" />
              </audio>
            </div>
            <div class="hero-card-foot">
              <div>
                <span>订阅地址</span>
                <strong>{feedSampleUrl()}</strong>
              </div>
              <a href={appUrl()}>管理播客</a>
            </div>
          </div>
        </section>

        <section id="features" class="section">
          <div class="section-title reveal" style="--delay: 0ms">
            <p>核心优势</p>
            <h2>播客客户端的体验，私人内容的自由</h2>
          </div>
          <div class="feature-grid">
            {featureCards.map((card, index) => (
              <article class="feature-card reveal" style={`--delay: ${index * 70}ms`}>
                <h3>{card.title}</h3>
                <p>{card.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="workflow" class="section workflow">
          <div class="section-title reveal" style="--delay: 0ms">
            <p>三步上手</p>
            <h2>上传、生成、订阅，从此只需一次操作</h2>
          </div>
          <div class="workflow-steps">
            <div class="step reveal" style="--delay: 80ms">
              <span>01</span>
              <h3>上传文件夹</h3>
              <p>拖拽整个音频目录，自动识别剧集顺序。</p>
            </div>
            <div class="step reveal" style="--delay: 160ms">
              <span>02</span>
              <h3>生成 RSS</h3>
              <p>系统即刻生成订阅链接，随时复制。</p>
            </div>
            <div class="step reveal" style="--delay: 240ms">
              <span>03</span>
              <h3>客户端订阅</h3>
              <p>在任何播客客户端粘贴链接，马上开听。</p>
            </div>
          </div>
          <div class="note reveal" style="--delay: 320ms">
            目前视频下载已支持 B 站，YouTube / 抖音等平台正在路线图中。
          </div>
        </section>

        <section id="scenarios" class="section scenarios">
          <div class="section-title reveal" style="--delay: 0ms">
            <p>适用场景</p>
            <h2>从音乐到有声书，所有内容都能播客化</h2>
          </div>
          <div class="scenario-grid">
            {scenarios.map((item, index) => (
              <article class="scenario-card reveal" style={`--delay: ${index * 90}ms`}>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="security" class="section security">
          <div class="section-title reveal" style="--delay: 0ms">
            <p>安全可控</p>
            <h2>完全掌控你的媒体与访问权限</h2>
          </div>
          <div class="security-grid">
            <div class="security-card reveal" style="--delay: 80ms">
              <h3>私有部署</h3>
              <p>所有音频与 RSS 都托管在你的服务器，告别平台限制。</p>
            </div>
            <div class="security-card reveal" style="--delay: 160ms">
              <h3>路径安全</h3>
              <p>文件操作限定在音频目录内，避免路径越界风险。</p>
            </div>
            <div class="security-card reveal" style="--delay: 240ms">
              <h3>灵活存储</h3>
              <p>支持本地或 S3，对外分享可使用 CDN。</p>
            </div>
          </div>
        </section>

        <section id="stack" class="section stack">
          <div class="section-title reveal" style="--delay: 0ms">
            <p>技术栈</p>
            <h2>专为稳定与可维护性打造</h2>
          </div>
          <div class="stack-list">
            {stack.map((item, index) => (
              <span class="stack-pill reveal" style={`--delay: ${index * 70}ms`}>
                {item}
              </span>
            ))}
          </div>
        </section>

        <section class="section cta">
          <div class="cta-card reveal" style="--delay: 0ms">
            <div>
              <h2>准备好把内容变成播客了吗？</h2>
              <p>快速部署，立即生成 RSS，播客客户端随时收听。</p>
            </div>
            <div class="cta-actions">
              <a class="primary" href={appUrl()}>打开控制台</a>
              <a class="secondary" href="https://github.com/yaotutu/folder2podcast" target="_blank" rel="noreferrer">
                查看文档
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer class="footer">
        <div>
          <strong>Folder2Podcast</strong>
          <span>MIT License · 自托管播客生成器</span>
        </div>
        <div class="footer-links">
          <a href={appUrl()}>管理界面</a>
          <a href="https://github.com/yaotutu/folder2podcast" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
