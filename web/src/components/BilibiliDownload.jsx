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
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'border-radius': '12px',
      padding: '2rem',
      'margin-bottom': '2rem',
      color: 'white',
      'box-shadow': '0 10px 30px rgba(0,0,0,0.2)'
    }}>
      {/* 标题 */}
      <div style={{ 'margin-bottom': '1.5rem' }}>
        <h2 style={{
          'font-size': '1.5rem',
          'font-weight': '700',
          margin: '0 0 0.5rem 0',
          display: 'flex',
          'align-items': 'center',
          gap: '0.5rem'
        }}>
          🎬 视频下载
        </h2>
        <p style={{
          margin: 0,
          opacity: 0.9,
          'font-size': '0.9rem'
        }}>
          支持多个视频平台，自动下载音频并添加到播客
        </p>
      </div>

      {/* 平台选项卡 */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        'margin-bottom': '1.5rem',
        'border-bottom': '2px solid rgba(255,255,255,0.2)',
        'padding-bottom': '0.5rem'
      }}>
        <For each={VIDEO_PLATFORMS}>
          {(platform) => (
            <button
              type="button"
              onClick={() => handlePlatformSwitch(platform.id)}
              disabled={!platform.enabled}
              style={{
                background: activePlatform() === platform.id
                  ? 'rgba(255,255,255,0.25)'
                  : 'transparent',
                border: 'none',
                color: platform.enabled ? 'white' : 'rgba(255,255,255,0.4)',
                padding: '0.75rem 1.5rem',
                'border-radius': '8px 8px 0 0',
                cursor: platform.enabled ? 'pointer' : 'not-allowed',
                'font-size': '0.95rem',
                'font-weight': activePlatform() === platform.id ? '600' : '500',
                transition: 'all 0.3s',
                display: 'flex',
                'align-items': 'center',
                gap: '0.5rem',
                opacity: platform.enabled ? 1 : 0.5,
                'border-bottom': activePlatform() === platform.id
                  ? '3px solid rgba(255,255,255,0.8)'
                  : '3px solid transparent',
                'margin-bottom': '-2px'
              }}
              onMouseEnter={(e) => {
                if (platform.enabled && activePlatform() !== platform.id) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                }
              }}
              onMouseLeave={(e) => {
                if (activePlatform() !== platform.id) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <span style={{ 'font-size': '1.2rem' }}>{platform.icon}</span>
              <span>{platform.name}</span>
              {!platform.enabled && (
                <span style={{
                  'font-size': '0.7rem',
                  background: 'rgba(255,255,255,0.2)',
                  padding: '0.15rem 0.5rem',
                  'border-radius': '10px'
                }}>
                  即将推出
                </span>
              )}
            </button>
          )}
        </For>
      </div>

      {/* 下载表单 */}
      <form onSubmit={handleAddTask}>
        {/* 主要输入区域 - 一行显示 */}
        <div style={{
          display: 'grid',
          'grid-template-columns': '2fr 1.5fr auto',
          gap: '1rem',
          'align-items': 'end',
          '@media (max-width: 768px)': {
            'grid-template-columns': '1fr'
          }
        }}>
          {/* 视频地址输入 */}
          <div>
            <label style={{
              display: 'block',
              'margin-bottom': '0.5rem',
              'font-size': '0.9rem',
              'font-weight': '500'
            }}>
              视频地址 *
            </label>
            <input
              type="text"
              value={url()}
              onInput={(e) => setUrl(e.target.value)}
              placeholder={getCurrentPlatform()?.placeholder || '视频地址'}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: 'none',
                'border-radius': '6px',
                'font-size': '0.95rem',
                background: 'rgba(255,255,255,0.9)',
                color: '#333'
              }}
            />
          </div>

          {/* 播客选择 */}
          <div>
            <label style={{
              display: 'block',
              'margin-bottom': '0.5rem',
              'font-size': '0.9rem',
              'font-weight': '500'
            }}>
              目标播客 *
            </label>
            <select
              value={selectedPodcast()}
              onChange={(e) => setSelectedPodcast(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: 'none',
                'border-radius': '6px',
                'font-size': '0.95rem',
                background: 'rgba(255,255,255,0.9)',
                color: '#333',
                cursor: 'pointer'
              }}
            >
              <option value="">-- 选择播客 --</option>
              <Show when={props.podcasts}>
                <For each={props.podcasts}>
                  {(podcast) => (
                    <option value={podcast.dirName}>
                      {podcast.title} ({podcast.episodeCount} 集)
                    </option>
                  )}
                </For>
              </Show>
            </select>
          </div>

          {/* 添加任务按钮 */}
          <button
            type="submit"
            disabled={!canSubmit()}
            class="btn"
            style={{
              background: canSubmit()
                ? 'rgba(255,255,255,0.9)'
                : 'rgba(255,255,255,0.3)',
              color: canSubmit() ? '#667eea' : 'rgba(255,255,255,0.6)',
              border: 'none',
              padding: '0.75rem 2rem',
              'border-radius': '6px',
              'font-weight': '600',
              'font-size': '1rem',
              cursor: canSubmit() ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s',
              'box-shadow': canSubmit() ? '0 4px 10px rgba(0,0,0,0.1)' : 'none',
              'white-space': 'nowrap'
            }}
          >
            ➕ 添加任务
          </button>
        </div>

        {/* 高级选项 - 可折叠 */}
        <div style={{ 'margin-top': '1rem' }}>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced())}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              color: 'white',
              padding: '0.5rem 1rem',
              'border-radius': '6px',
              cursor: 'pointer',
              'font-size': '0.85rem',
              display: 'flex',
              'align-items': 'center',
              gap: '0.5rem'
            }}
          >
            {showAdvanced() ? '▼' : '▶'} 高级选项
          </button>

          <Show when={showAdvanced()}>
            <div style={{
              'margin-top': '1rem',
              padding: '1rem',
              background: 'rgba(255,255,255,0.1)',
              'border-radius': '6px'
            }}>
              <label style={{
                display: 'block',
                'margin-bottom': '0.5rem',
                'font-size': '0.9rem',
                'font-weight': '500'
              }}>
                自定义剧集标题（可选）
              </label>
              <input
                type="text"
                value={episodeTitle()}
                onInput={(e) => setEpisodeTitle(e.target.value)}
                placeholder="默认使用视频标题"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: 'none',
                  'border-radius': '6px',
                  'font-size': '0.95rem',
                  background: 'rgba(255,255,255,0.9)',
                  color: '#333'
                }}
              />
              <div style={{
                'margin-top': '0.5rem',
                'font-size': '0.8rem',
                opacity: 0.8
              }}>
                💡 留空则自动使用视频的原始标题
              </div>
            </div>
          </Show>
        </div>
      </form>

      {/* 使用提示 */}
      <Show when={getCurrentPlatform()?.tips?.length > 0}>
        <div style={{
          'margin-top': '1.5rem',
          'padding-top': '1.5rem',
          'border-top': '1px solid rgba(255,255,255,0.2)',
          'font-size': '0.85rem',
          opacity: 0.8
        }}>
          <p style={{ margin: '0 0 0.5rem 0' }}>
            💡 使用说明：
          </p>
          <ul style={{
            margin: 0,
            'padding-left': '1.5rem'
          }}>
            <For each={getCurrentPlatform()?.tips || []}>
              {(tip) => <li>{tip}</li>}
            </For>
          </ul>
        </div>
      </Show>
    </div>
  );
}
