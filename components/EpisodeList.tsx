/**
 * 剧集列表组件 - MUI 版本
 */

'use client';

import { useState } from 'react';
import type { Episode, Podcast } from '@/lib/types';
import EpisodeEditorModal from './EpisodeEditorModal';
import { showAlert } from '@/lib/stores/dialog';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import MusicNote from '@mui/icons-material/MusicNote';
import Folder from '@mui/icons-material/Folder';
import Edit from '@mui/icons-material/Edit';

interface EpisodeListProps {
  episodes: Episode[];
  podcast: Podcast;
  onEpisodeChanged?: () => void;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '--:--';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export default function EpisodeList({ episodes, podcast, onEpisodeChanged }: EpisodeListProps) {
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);

  const handleEditClick = async (episode: Episode) => {
    // 如果启用了继承，提示用户先取消继承
    if (podcast.inheritanceEnabled) {
      await showAlert(
        '当前播客已启用继承设置。\n\n请先在顶部取消"已启用继承"开关，才能编辑单集的封面、描述等信息。',
        '提示'
      );
      return;
    }
    setEditingEpisode(episode);
  };

  const handleEditorClose = () => {
    setEditingEpisode(null);
  };

  const handleEditorSaved = () => {
    setEditingEpisode(null);
    if (onEpisodeChanged) {
      onEpisodeChanged();
    }
  };

  if (episodes.length === 0) {
    return (
      <Box
        sx={{
          textAlign: 'center',
          py: 6,
          borderRadius: 1,
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            p: 1.5,
            borderRadius: 1,
            display: 'inline-block',
            bgcolor: 'action.hover',
          }}
        >
          <Folder sx={{ fontSize: 48, color: 'text.disabled' }} />
        </Box>
        <Box sx={{ mt: 2, fontSize: '0.875rem', fontWeight: 600 }}>
          暂无剧集
        </Box>
        <Box sx={{ mt: 0.5, fontSize: '0.6875rem', color: 'text.secondary' }}>
          上传音频文件后会自动生成剧集
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        borderRadius: 1,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      {/* 表头 */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '32px 1fr 60px 70px 90px 400px 32px',
          gap: 1.5,
          p: '10px 12px',
          bgcolor: 'action.hover',
          fontSize: '0.6875rem',
          fontWeight: 600,
          color: 'text.secondary',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <div></div>
        <div>标题</div>
        <div>时长</div>
        <div>大小</div>
        <div>日期</div>
        <div>播放</div>
        <div></div>
      </Box>

      {/* 剧集列表 */}
      {episodes.map((episode, index) => (
        <Box
          key={episode.id}
          sx={{
            display: 'grid',
            gridTemplateColumns: '32px 1fr 60px 70px 90px 400px 32px',
            gap: 1.5,
            p: 1.5,
            alignItems: 'center',
            borderBottom: index < episodes.length - 1 ? 1 : 0,
            borderColor: 'action.hover',
            transition: 'background 0.15s ease',
            cursor: 'default',
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          {/* 封面 */}
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 0.5,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              bgcolor: 'action.hover',
            }}
          >
            {episode.imageUrl ? (
              <Box
                component="img"
                src={episode.imageUrl}
                alt={episode.title}
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <MusicNote sx={{ fontSize: 16, color: 'text.disabled' }} />
            )}
          </Box>

          {/* 标题 */}
          <Box
            sx={{
              fontSize: '0.8125rem',
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={episode.title}
          >
            {episode.title}
          </Box>

          {/* 时长 */}
          <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            {formatDuration(episode.duration)}
          </Box>

          {/* 大小 */}
          <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            {formatFileSize(episode.fileSize)}
          </Box>

          {/* 日期 */}
          <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            {formatDate(episode.pubDate)}
          </Box>

          {/* 播放器 */}
          <Box
            component="audio"
            controls
            preload="none"
            sx={{
              width: '100%',
              height: 24,
              outline: 'none',
            }}
          >
            <source src={episode.audioUrl} type="audio/mpeg" />
          </Box>

          {/* 编辑按钮 */}
          <IconButton
            size="small"
            onClick={() => handleEditClick(episode)}
            disabled={podcast.inheritanceEnabled}
            title={podcast.inheritanceEnabled ? '请先取消继承设置' : '编辑'}
            sx={{
              opacity: podcast.inheritanceEnabled ? 0.5 : 1,
            }}
          >
            <Edit sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      ))}

      {/* 编辑模态框 */}
      {editingEpisode && (
        <EpisodeEditorModal
          episode={editingEpisode}
          podcast={podcast}
          onClose={handleEditorClose}
          onSaved={handleEditorSaved}
        />
      )}
    </Box>
  );
}
