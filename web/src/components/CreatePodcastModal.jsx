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
    description: '',
    author: '',
    email: '',
    language: 'zh-cn',
    category: 'Podcast'
  });
  const [coverFile, setCoverFile] = createSignal(null);
  const [coverPreview, setCoverPreview] = createSignal('');
  const [showAdvanced, setShowAdvanced] = createSignal(false);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [error, setError] = createSignal('');

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        setError('请选择图片文件');
        return;
      }

      // 验证文件大小（限制5MB）
      if (file.size > 5 * 1024 * 1024) {
        setError('封面图片不能超过 5MB');
        return;
      }

      setCoverFile(file);

      // 生成预览
      const reader = new FileReader();
      reader.onload = (e) => {
        setCoverPreview(e.target.result);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

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

      // 如果有封面，上传封面
      if (coverFile()) {
        try {
          const formData = new FormData();
          formData.append('cover', coverFile());

          await fetch(`/api/podcasts/${dirName}/cover`, {
            method: 'POST',
            body: formData
          });
        } catch (err) {
          console.error('封面上传失败:', err);
          // 不阻塞创建流程
        }
      }

      // 成功后关闭模态框并刷新列表
      props.onSuccess?.();

      // 重置表单
      setFormData({
        title: '',
        description: '',
        author: '',
        email: '',
        language: 'zh-cn',
        category: 'Podcast'
      });
      setCoverFile(null);
      setCoverPreview('');
      setShowAdvanced(false);
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
                  填写基本信息即可快速创建播客
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
                    placeholder="例如：技术播客、读书分享"
                    required
                  />
                  <Show when={formData().title}>
                    <p style={{
                      'font-size': '0.75rem',
                      color: 'var(--text-muted)',
                      'margin-top': '0.25rem'
                    }}>
                      目录名将自动生成为: <code style={{
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

                {/* 封面上传 */}
                <div>
                  <label class="field-label" style={{ 'margin-bottom': '0.5rem', display: 'block' }}>
                    播客封面
                  </label>
                  <div style={{ display: 'flex', gap: '1rem', 'align-items': 'flex-start' }}>
                    {/* 预览区 */}
                    <Show when={coverPreview()} fallback={
                      <div style={{
                        width: '120px',
                        height: '120px',
                        border: '2px dashed var(--border)',
                        'border-radius': 'var(--radius-sm)',
                        display: 'flex',
                        'align-items': 'center',
                        'justify-content': 'center',
                        background: 'var(--surface-soft)',
                        color: 'var(--text-muted)',
                        'font-size': '3rem'
                      }}>
                        📻
                      </div>
                    }>
                      <img
                        src={coverPreview()}
                        alt="封面预览"
                        style={{
                          width: '120px',
                          height: '120px',
                          'object-fit': 'cover',
                          'border-radius': 'var(--radius-sm)',
                          border: '1px solid var(--border)'
                        }}
                      />
                    </Show>

                    {/* 上传按钮 */}
                    <div style={{ flex: 1 }}>
                      <label class="btn btn-secondary" style={{ cursor: 'pointer' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{ 'margin-right': '0.5rem' }}>
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                        </svg>
                        选择封面
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCoverChange}
                          style={{ display: 'none' }}
                        />
                      </label>
                      <p style={{
                        'font-size': '0.75rem',
                        color: 'var(--text-muted)',
                        'margin-top': '0.5rem'
                      }}>
                        推荐尺寸 1400x1400，支持 JPG、PNG 格式，不超过 5MB
                      </p>
                    </div>
                  </div>
                </div>

                <div class="divider"></div>

                {/* 高级选项折叠面板 */}
                <div>
                  <button
                    type="button"
                    class="btn btn-soft btn-sm"
                    onClick={() => setShowAdvanced(!showAdvanced())}
                    style={{ width: '100%', 'justify-content': 'space-between' }}
                  >
                    <span>高级选项</span>
                    <span>{showAdvanced() ? '收起' : '展开'}</span>
                  </button>

                  <Show when={showAdvanced()}>
                    <div style={{
                      'margin-top': '1rem',
                      padding: '1rem',
                      background: 'var(--surface-soft)',
                      'border-radius': 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      'flex-direction': 'column',
                      gap: '1rem'
                    }}>
                      {/* 作者 */}
                      <div>
                        <label class="field-label" style={{ 'margin-bottom': '0.5rem', display: 'block' }}>
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
                        <label class="field-label" style={{ 'margin-bottom': '0.5rem', display: 'block' }}>
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
                          <label class="field-label" style={{ 'margin-bottom': '0.5rem', display: 'block' }}>
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
                          <label class="field-label" style={{ 'margin-bottom': '0.5rem', display: 'block' }}>
                            分类
                          </label>
                          <input
                            type="text"
                            class="input"
                            value={formData().category}
                            onInput={(e) => updateField('category', e.target.value)}
                            placeholder="例如: Technology"
                          />
                        </div>
                      </div>
                    </div>
                  </Show>
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
