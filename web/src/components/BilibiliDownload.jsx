import { createSignal, Show, For } from 'solid-js';
import { taskManager } from '../utils/taskManager';
import { useToast } from './Toast';

/**
 * 视频平台定义
 */
const VIDEO_PLATFORMS = [
  {
    id: 'bilibili',
    name: 'B站',
    icon: '📺',
    enabled: true,
    placeholder: 'BV1qt4y1X7TW 或完整 URL',
    tips: [
      '提交后任务会自动添加到下载队列',
      '可以继续添加更多任务，无需等待',
      '查看右下角浮动窗口了解下载进度',
      '支持格式：完整URL、短链接、BV号、AV号'
    ]
  },
  {
    id: 'douyin',
    name: '抖音',
    icon: '🎵',
    enabled: false,
    placeholder: '抖音视频链接',
    tips: []
  },
  {
    id: 'xigua',
    name: '西瓜视频',
    icon: '🍉',
    enabled: false,
    placeholder: '西瓜视频链接',
    tips: []
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: '▶️',
    enabled: false,
    placeholder: 'YouTube 视频链接',
    tips: []
  }
];

/**
 * 视频下载组件（多平台支持）
 *
 * 这是一个重要的核心功能，放在首页顶部
 * 支持多个视频平台，当前只有 B站 可用
 */
export default function BilibiliDownload(props) {
  const toast = useToast();

  // 当前选中的平台
  const [activePlatform, setActivePlatform] = createSignal('bilibili');

  // 表单状态
  const [url, setUrl] = createSignal('');
  const [selectedPodcast, setSelectedPodcast] = createSignal('');
  const [episodeTitle, setEpisodeTitle] = createSignal('');

  // 高级选项展开状态
  const [showAdvanced, setShowAdvanced] = createSignal(false);

  // 获取当前平台配置
  const getCurrentPlatform = () => {
    return VIDEO_PLATFORMS.find(p => p.id === activePlatform());
  };

  /**
   * 处理平台切换
   */
  const handlePlatformSwitch = (platformId) => {
    const platform = VIDEO_PLATFORMS.find(p => p.id === platformId);
    if (!platform.enabled) {
      toast.info(`${platform.name} 即将推出，敬请期待`);
      return;
    }
    setActivePlatform(platformId);
    // 切换平台时清空表单
    setUrl('');
    setEpisodeTitle('');
    setShowAdvanced(false);
  };

  /**
   * 处理添加任务
   */
  const handleAddTask = (e) => {
    e.preventDefault();

    const videoUrl = url().trim();
    if (!videoUrl) {
      toast.error('请输入视频地址');
      return;
    }

    if (!selectedPodcast()) {
      toast.error('请选择目标播客');
      return;
    }

    // 构建任务参数
    const taskData = {
      url: videoUrl,
      podcastName: selectedPodcast(),
      autoCreatePodcast: false, // 始终为 false，强制选择播客
    };

    // 添加可选参数
    if (episodeTitle().trim()) {
      taskData.episodeTitle = episodeTitle().trim();
    }

    // 添加到任务队列
    const taskId = taskManager.addTask(taskData);

    // 显示成功提示
    toast.success('任务已添加到下载队列');

    // 清空表单
    setUrl('');
    setEpisodeTitle('');

    // 不清空播客选择，方便连续添加到同一个播客
    // setSelectedPodcast('');

    // 通知父组件刷新播客列表（异步，不阻塞）
    if (props.onTaskAdded) {
      props.onTaskAdded(taskId);
    }
  };

  // 检查是否可以提交
  const canSubmit = () => {
    return url().trim() && selectedPodcast();
  };

  return (
    <section class="section-card download-panel">
      <div class="section-header">
        <div>
          <p class="eyebrow">Video Import</p>
          <h2 style={{ margin: 0 }}>视频下载与导入</h2>
          <p>粘贴链接、选择播客即可自动下载音频并推送到目录，进度会同步到右下角任务窗口。</p>
        </div>
      </div>

      <div class="platform-tabs">
        <For each={VIDEO_PLATFORMS}>
          {(platform) => (
            <button
              type="button"
              class={`platform-tab ${activePlatform() === platform.id ? 'is-active' : ''} ${platform.enabled ? '' : 'is-disabled'}`}
              onClick={() => handlePlatformSwitch(platform.id)}
            >
              <span>{platform.icon}</span>
              <span>{platform.name}</span>
              <Show when={!platform.enabled}>
                <span style={{ fontSize: '0.75rem' }}>Soon</span>
              </Show>
            </button>
          )}
        </For>
      </div>

      <form onSubmit={handleAddTask} style={{ display: 'flex', 'flex-direction': 'column', gap: '1.25rem' }}>
        <div class="form-grid">
          <div>
            <div class="field-label">视频链接</div>
            <input
              type="text"
              class="input"
              placeholder={getCurrentPlatform().placeholder}
              value={url()}
              onInput={(e) => setUrl(e.target.value)}
            />
          </div>
          <div>
            <div class="field-label">目标播客</div>
            <select
              value={selectedPodcast()}
              onChange={(e) => setSelectedPodcast(e.target.value)}
            >
              <option value="">请选择播客</option>
              <For each={props.podcasts}>
                {(podcast) => (
                  <option value={podcast.dirName}>
                    {podcast.title} ({podcast.episodeCount || 0} 集)
                  </option>
                )}
              </For>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', gap: '1rem', 'flex-wrap': 'wrap' }}>
          <div>
            <div class="field-label" style={{ margin: 0 }}>高级选项</div>
            <p class="text-sm" style={{ margin: 0 }}>
              自定义剧集标题，可覆盖下载源的默认标题。
            </p>
          </div>
          <button
            type="button"
            class="btn btn-soft btn-sm"
            onClick={() => setShowAdvanced(!showAdvanced())}
          >
            {showAdvanced() ? '收起' : '展开'}高级选项
          </button>
        </div>

        <Show when={showAdvanced()}>
          <div class="advanced-panel" style={{ padding: '1rem', border: '1px dashed var(--border)', background: 'var(--surface-soft)', 'border-radius': 'var(--radius-sm)' }}>
            <div class="field-label">自定义剧集标题</div>
            <input
              type="text"
              class="input"
              placeholder="可选，例如：第 12 期 B 站访谈"
              value={episodeTitle()}
              onInput={(e) => setEpisodeTitle(e.target.value)}
            />
          </div>
        </Show>

        {/* 操作按钮 */}
        <div style={{ display: 'flex', gap: '0.75rem', 'padding-top': '0.5rem' }}>
          <button
            type="submit"
            class="btn btn-primary"
            disabled={!canSubmit()}
            style={{ flex: 1 }}
          >
            开始下载
          </button>
        </div>

        <div class="divider"></div>

        {/* 提示信息 */}
        <div style={{ background: 'var(--accent-soft)', padding: '1rem', 'border-radius': 'var(--radius-sm)' }}>
          <ul class="tips-list" style={{ margin: 0, 'padding-left': '1.2rem' }}>
            <For each={getCurrentPlatform().tips}>
              {(tip) => <li>{tip}</li>}
            </For>
          </ul>
        </div>
      </form>
    </section>
  );
}
