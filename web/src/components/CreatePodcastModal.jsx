import { createSignal, Show } from 'solid-js';
import { podcastsAPI } from '../utils/api';

/**
 * 将标题转换为合法的目录名
 * - 移除特殊字符
 * - 空格转为中划线
 * - 转为小写
 */
function titleToDirName(title) {
  return title
    .toLowerCase()
    .replace(/[\s]+/g, '-')           // 空格转为中划线
    .replace(/[^\w\u4e00-\u9fa5-]/g, '') // 只保留字母、数字、中文、中划线、下划线
    .replace(/^-+|-+$/g, '')          // 去除首尾的中划线
    .substring(0, 50);                // 限制长度
}

export default function CreatePodcastModal(props) {
  const [formData, setFormData] = createSignal({
    title: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [error, setError] = createSignal('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const data = formData();

    // 验证必填字段
    if (!data.title) {
      setError('播客标题为必填项');
      return;
    }

    // 自动生成目录名
    const dirName = titleToDirName(data.title);

    if (!dirName) {
      setError('播客标题无法生成有效的目录名，请使用字母、数字或中文');
      return;
    }

    setIsSubmitting(true);

    try {
      // 创建播客
      await podcastsAPI.create({
        dirName: dirName,
        title: data.title,
        description: data.description
      });

      // 成功后关闭模态框并刷新列表
      props.onSuccess?.();

      // 重置表单
      setFormData({
        title: '',
        description: ''
      });
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
            {/* 头部 */}
            <div style={{
              display: 'flex',
              'justify-content': 'space-between',
              'align-items': 'center',
              'margin-bottom': '1.5rem'
            }}>
              <div>
                <h2 style={{ 'font-size': '1.5rem', 'font-weight': '700', margin: 0 }}>
                  创建新播客
                </h2>
                <p style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                  填写基本信息即可快速创建,其他配置可在创建后编辑
                </p>
              </div>
              <button
                class="btn btn-ghost"
                style={{ padding: '0.5rem' }}
                onClick={props.onClose}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* 错误提示 */}
            <Show when={error()}>
              <div style={{
                background: '#fee2e2',
                color: '#991b1b',
                padding: '0.75rem 1rem',
                'border-radius': 'var(--radius-sm)',
                'margin-bottom': '1rem',
                'font-size': '0.875rem'
              }}>
                {error()}
              </div>
            </Show>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', 'flex-direction': 'column', gap: '1.25rem' }}>

                {/* 标题 */}
                <div>
                  <label class="field-label" style={{ 'margin-bottom': '0.5rem', display: 'block' }}>
                    播客标题 <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    class="input"
                    value={formData().title}
                    onInput={(e) => updateField('title', e.target.value)}
                    placeholder="例如:技术播客、读书分享"
                    required
                  />
                  <Show when={formData().title}>
                    <p style={{
                      'font-size': '0.75rem',
                      color: 'var(--text-muted)',
                      'margin-top': '0.25rem'
                    }}>
                      目录名: <code style={{
                        background: 'var(--surface-soft)',
                        padding: '0.125rem 0.375rem',
                        'border-radius': '0.25rem'
                      }}>{titleToDirName(formData().title) || '(无效)'}</code>
                    </p>
                  </Show>
                </div>

                {/* 描述 */}
                <div>
                  <label class="field-label" style={{ 'margin-bottom': '0.5rem', display: 'block' }}>
                    播客描述 <span style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'font-weight': 'normal' }}>(可选)</span>
                  </label>
                  <textarea
                    class="input"
                    value={formData().description}
                    onInput={(e) => updateField('description', e.target.value)}
                    placeholder="简要描述您的播客内容,可在创建后完善"
                    rows="3"
                    style={{ resize: 'vertical' }}
                  />
                  <p style={{
                    'font-size': '0.75rem',
                    color: 'var(--text-muted)',
                    'margin-top': '0.25rem'
                  }}>
                    创建后可在配置中添加封面、作者等详细信息
                  </p>
                </div>
              </div>

              {/* 按钮 */}
              <div style={{
                display: 'flex',
                gap: '0.75rem',
                'margin-top': '1.5rem',
                'padding-top': '1rem',
                'border-top': '1px solid var(--border)'
              }}>
                <button
                  type="button"
                  class="btn btn-secondary"
                  onClick={props.onClose}
                  disabled={isSubmitting()}
                  style={{ flex: 1 }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  class="btn btn-primary"
                  disabled={isSubmitting()}
                  style={{ flex: 2 }}
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
