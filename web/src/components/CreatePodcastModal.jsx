import { createSignal, Show } from 'solid-js';
import { podcastsAPI } from '../utils/api';

export default function CreatePodcastModal(props) {
  const [formData, setFormData] = createSignal({
    dirName: '',
    title: '',
    description: '',
    author: '',
    email: '',
    language: 'zh-cn',
    category: 'Podcast'
  });
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [error, setError] = createSignal('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const data = formData();

    // 验证必填字段
    if (!data.dirName || !data.title) {
      setError('播客目录名和标题为必填项');
      return;
    }

    // 验证目录名（只允许字母、数字、下划线、中划线）
    if (!/^[a-zA-Z0-9_-]+$/.test(data.dirName)) {
      setError('播客目录名只能包含字母、数字、下划线和中划线');
      return;
    }

    setIsSubmitting(true);

    try {
      await podcastsAPI.create({
        dirName: data.dirName,
        metadata: {
          title: data.title,
          description: data.description,
          author: data.author,
          email: data.email,
          language: data.language,
          category: data.category,
          explicit: false
        }
      });

      // 成功后关闭模态框并刷新列表
      props.onSuccess?.();
    } catch (err) {
      setError(err.message || '创建播客失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Show when={props.show}>
      <div class="modal-overlay" onClick={props.onClose}>
        <div class="modal" onClick={(e) => e.stopPropagation()}>
          <div style={{ padding: '1.5rem' }}>
            <div style={{
              display: 'flex',
              'justify-content': 'space-between',
              'align-items': 'center',
              'margin-bottom': '1.5rem'
            }}>
              <h2 style={{ 'font-size': '1.5rem', 'font-weight': '700' }}>
                创建新播客
              </h2>
              <button
                class="btn"
                style={{
                  background: 'transparent',
                  color: '#6b7280',
                  padding: '0.25rem'
                }}
                onClick={props.onClose}
              >
                ✕
              </button>
            </div>

            <Show when={error()}>
              <div style={{
                background: '#fee2e2',
                color: '#991b1b',
                padding: '0.75rem',
                'border-radius': '0.375rem',
                'margin-bottom': '1rem',
                'font-size': '0.875rem'
              }}>
                {error()}
              </div>
            </Show>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', 'flex-direction': 'column', gap: '1rem' }}>
                {/* 目录名 */}
                <div>
                  <label style={{
                    display: 'block',
                    'font-size': '0.875rem',
                    'font-weight': '500',
                    'margin-bottom': '0.5rem'
                  }}>
                    播客目录名 <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    class="input"
                    value={formData().dirName}
                    onInput={(e) => updateField('dirName', e.target.value)}
                    placeholder="例如: my-podcast"
                    required
                  />
                  <p style={{
                    'font-size': '0.75rem',
                    color: '#6b7280',
                    'margin-top': '0.25rem'
                  }}>
                    只能包含字母、数字、下划线和中划线
                  </p>
                </div>

                {/* 标题 */}
                <div>
                  <label style={{
                    display: 'block',
                    'font-size': '0.875rem',
                    'font-weight': '500',
                    'margin-bottom': '0.5rem'
                  }}>
                    播客标题 <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    class="input"
                    value={formData().title}
                    onInput={(e) => updateField('title', e.target.value)}
                    placeholder="例如: 我的播客"
                    required
                  />
                </div>

                {/* 描述 */}
                <div>
                  <label style={{
                    display: 'block',
                    'font-size': '0.875rem',
                    'font-weight': '500',
                    'margin-bottom': '0.5rem'
                  }}>
                    播客描述
                  </label>
                  <textarea
                    class="input"
                    value={formData().description}
                    onInput={(e) => updateField('description', e.target.value)}
                    placeholder="简要描述您的播客内容"
                    rows="3"
                    style={{ resize: 'vertical' }}
                  />
                </div>

                {/* 作者 */}
                <div>
                  <label style={{
                    display: 'block',
                    'font-size': '0.875rem',
                    'font-weight': '500',
                    'margin-bottom': '0.5rem'
                  }}>
                    作者
                  </label>
                  <input
                    type="text"
                    class="input"
                    value={formData().author}
                    onInput={(e) => updateField('author', e.target.value)}
                    placeholder="作者名称"
                  />
                </div>

                {/* 邮箱 */}
                <div>
                  <label style={{
                    display: 'block',
                    'font-size': '0.875rem',
                    'font-weight': '500',
                    'margin-bottom': '0.5rem'
                  }}>
                    邮箱
                  </label>
                  <input
                    type="email"
                    class="input"
                    value={formData().email}
                    onInput={(e) => updateField('email', e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>

                {/* 语言和分类 */}
                <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      'font-size': '0.875rem',
                      'font-weight': '500',
                      'margin-bottom': '0.5rem'
                    }}>
                      语言
                    </label>
                    <select
                      class="input"
                      value={formData().language}
                      onChange={(e) => updateField('language', e.target.value)}
                    >
                      <option value="zh-cn">中文</option>
                      <option value="en">English</option>
                      <option value="ja">日本語</option>
                    </select>
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      'font-size': '0.875rem',
                      'font-weight': '500',
                      'margin-bottom': '0.5rem'
                    }}>
                      分类
                    </label>
                    <input
                      type="text"
                      class="input"
                      value={formData().category}
                      onInput={(e) => updateField('category', e.target.value)}
                      placeholder="例如: Technology, Education"
                    />
                  </div>
                </div>
              </div>

              {/* 按钮 */}
              <div style={{
                display: 'flex',
                'justify-content': 'flex-end',
                gap: '0.75rem',
                'margin-top': '1.5rem'
              }}>
                <button
                  type="button"
                  class="btn"
                  style={{
                    background: '#e5e7eb',
                    color: '#374151'
                  }}
                  onClick={props.onClose}
                  disabled={isSubmitting()}
                >
                  取消
                </button>
                <button
                  type="submit"
                  class="btn btn-primary"
                  disabled={isSubmitting()}
                >
                  {isSubmitting() ? '创建中...' : '创建播客'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Show>
  );
}
