/**
 * 复制文本到剪贴板（兼容 HTTP 环境）
 *
 * 说明：
 * - navigator.clipboard API 只能在 HTTPS 或 localhost 下使用
 * - 本函数使用传统的 document.execCommand 方法，兼容所有环境
 *
 * @param text - 要复制的文本
 * @returns Promise<boolean> - 复制是否成功
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // 创建临时 textarea 元素
    const textarea = document.createElement('textarea');
    textarea.value = text;

    // 设置样式，使其不可见且不影响布局
    textarea.style.position = 'fixed';
    textarea.style.left = '-999999px';
    textarea.style.top = '-999999px';
    textarea.style.opacity = '0';

    // 添加到 DOM
    document.body.appendChild(textarea);

    // 选中文本
    textarea.focus();
    textarea.select();

    // 尝试复制
    const successful = document.execCommand('copy');

    // 移除临时元素
    document.body.removeChild(textarea);

    return successful;
  } catch (err) {
    console.error('复制失败:', err);
    return false;
  }
}
