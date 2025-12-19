import { createSignal, onMount, Show } from 'solid-js';
import PodcastList from './components/PodcastList';
import FileManager from './components/FileManager';
import FloatingTaskWindow from './components/FloatingTaskWindow';
import { ToastProvider } from './components/Toast';

export default function App() {
  const [selectedPodcast, setSelectedPodcast] = createSignal(null);
  const [view, setView] = createSignal('list'); // 'list' or 'files'

  const handleSelectPodcast = (podcast) => {
    setSelectedPodcast(podcast);
    setView('files');
  };

  const handleBack = () => {
    setView('list');
    setSelectedPodcast(null);
  };

  return (
    <ToastProvider>
      <div style={{ 'min-height': '100vh' }}>
        {/* 顶部导航栏 */}
        <nav style={{
          background: '#3b82f6',
          color: 'white',
          padding: '1rem 2rem',
          'box-shadow': '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            'max-width': '1200px',
            margin: '0 auto',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'space-between'
          }}>
            <h1 style={{
              'font-size': '1.5rem',
              'font-weight': '700',
              margin: 0
            }}>
              📻 Folder2Podcast 管理界面
            </h1>
            <Show when={view() === 'files'}>
              <button
                class="btn"
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)'
                }}
                onClick={handleBack}
              >
                ← 返回列表
              </button>
            </Show>
          </div>
        </nav>

        {/* 主内容区 */}
        <main style={{
          'max-width': '1200px',
          margin: '2rem auto',
          padding: '0 1rem'
        }}>
          <Show
            when={view() === 'files' && selectedPodcast()}
            fallback={<PodcastList onSelect={handleSelectPodcast} />}
          >
            <FileManager podcast={selectedPodcast()} />
          </Show>
        </main>

        {/* 浮动任务窗口 */}
        <FloatingTaskWindow />
      </div>
    </ToastProvider>
  );
}
