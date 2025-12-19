export default function AudioPlayer(props) {
  return (
    <div class="modal-overlay" onClick={props.onClose}>
      <div class="modal" onClick={(e) => e.stopPropagation()} style={{ 'max-width': '500px' }}>
        <div style={{ padding: '1.5rem' }}>
          <div class="flex items-center justify-between mb-4">
            <h3 style={{ 'font-size': '1.25rem', 'font-weight': '600' }}>
              🎵 {props.audio.fileName}
            </h3>
            <button
              class="btn btn-sm"
              style={{ background: '#6b7280', color: 'white' }}
              onClick={props.onClose}
            >
              ✕
            </button>
          </div>

          <audio
            controls
            autoplay
            style={{ width: '100%' }}
            src={props.audio.url}
          >
            您的浏览器不支持音频播放
          </audio>

          <p class="text-sm text-secondary" style={{ 'margin-top': '1rem', 'text-align': 'center' }}>
            提示：关闭此窗口音频将停止播放
          </p>
        </div>
      </div>
    </div>
  );
}
