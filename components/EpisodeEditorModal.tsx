/**
 * 剧集编辑模态框组件 - MUI 版本
 */

'use client';

import { useState } from 'react';
import type { Episode, Podcast } from '@/lib/types';
import { episodesAPI } from '@/lib/api/client';
import { showAlert, showConfirm } from '@/lib/stores/dialog';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Delete from '@mui/icons-material/Delete';
import Image from '@mui/icons-material/Image';

interface EpisodeEditorModalProps {
  episode: Episode;
  podcast: Podcast;
  onClose: () => void;
  onSaved: () => void;
}

export default function EpisodeEditorModal({
  episode,
  podcast,
  onClose,
  onSaved,
}: EpisodeEditorModalProps) {
  const [formData, setFormData] = useState({
    title: episode.title,
    description: episode.description || '',
    sortOrder: episode.sortOrder || 1,
    pubDate: episode.pubDate,
  });

  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage('');

    try {
      const response = await episodesAPI.update(podcast.userId, podcast.dirName, episode.id, {
        ...formData,
        pubDate: formData.pubDate,
      });

      if (response.status === 'success') {
        // 保存成功，通知父组件刷新数据
        onSaved();
        // 可选：显示成功提示（暂时不关闭对话框）
      } else {
        const errorMsg = response.status === 'error' ? response.message : '保存失败';
        setErrorMessage(errorMsg);
      }
    } catch (error) {
      console.error('[EpisodeEditor] Save error:', error);
      setErrorMessage('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = await showConfirm(
      `确定删除剧集 "${episode.title}" 吗？此操作将同时删除音频文件和封面。`,
      '确认删除'
    );
    if (!confirmed) {
      return;
    }

    try {
      const response = await episodesAPI.delete(podcast.userId, podcast.dirName, episode.id);

      if (response.status === 'success') {
        onSaved();
        onClose();
      } else {
        const errorMsg = response.status === 'error' ? response.message : '删除失败';
        await showAlert(errorMsg, '错误');
      }
    } catch (error) {
      console.error('[EpisodeEditor] Delete error:', error);
      await showAlert('删除失败，请重试', '错误');
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMessage('');

    try {
      const response = await episodesAPI.uploadCover(podcast.userId, podcast.dirName, episode.id, file);

      if (response.status === 'success') {
        onSaved(); // 刷新数据
      } else {
        const errorMsg = response.status === 'error' ? response.message : '上传失败';
        setErrorMessage(errorMsg);
      }
    } catch (error) {
      console.error('[EpisodeEditor] Cover upload error:', error);
      setErrorMessage('上传失败，请重试');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteCover = async () => {
    const confirmed = await showConfirm('确定删除封面吗？');
    if (!confirmed) return;

    setIsUploading(true);
    setErrorMessage('');

    try {
      const response = await episodesAPI.deleteCover(podcast.userId, podcast.dirName, episode.id);

      if (response.status === 'success') {
        onSaved(); // 刷新数据
      } else {
        const errorMsg = response.status === 'error' ? response.message : '删除失败';
        setErrorMessage(errorMsg);
      }
    } catch (error) {
      console.error('[EpisodeEditor] Cover delete error:', error);
      setErrorMessage('删除失败，请重试');
    } finally {
      setIsUploading(false);
    }
  };

  const formatDateForInput = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().slice(0, 16);
  };

  return (
    <Dialog open={true} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>编辑剧集</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* 错误提示 */}
          {errorMessage && (
            <Alert severity="error">
              {errorMessage}
            </Alert>
          )}

          {/* 音频播放器 */}
          <Box>
            <Box sx={{ fontSize: '0.875rem', fontWeight: 600, mb: 1 }}>
              音频文件
            </Box>
            <Box sx={{ mb: 1, fontSize: '0.6875rem', color: 'text.secondary' }}>
              {episode.fileName}
            </Box>
            <Box component="audio" src={episode.audioUrl} controls sx={{ width: '100%' }} />
          </Box>

          {/* 封面管理 */}
          <Box>
            <Box sx={{ fontSize: '0.875rem', fontWeight: 600, mb: 1 }}>
              剧集封面
            </Box>
            {episode.coverFileName && episode.imageUrl ? (
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  component="img"
                  src={episode.imageUrl}
                  alt="封面"
                  sx={{
                    width: 128,
                    height: 128,
                    objectFit: 'cover',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                />
                <Button
                  variant="text"
                  startIcon={<Delete />}
                  onClick={handleDeleteCover}
                  disabled={isUploading}
                  color="error"
                >
                  删除封面
                </Button>
              </Stack>
            ) : (
              <Box>
                <input
                  type="file"
                  id="episode-cover-upload"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleCoverUpload}
                  disabled={isUploading}
                  style={{ display: 'none' }}
                />
                <label htmlFor="episode-cover-upload">
                  <Button
                    component="span"
                    variant="outlined"
                    startIcon={isUploading ? <CircularProgress size={16} /> : <Image />}
                    disabled={isUploading}
                  >
                    {isUploading ? '上传中...' : '上传封面'}
                  </Button>
                </label>
                <Box sx={{ mt: 0.5, fontSize: '0.6875rem', color: 'text.secondary' }}>
                  支持 JPEG、PNG、WebP 格式，最大 10MB
                </Box>
              </Box>
            )}
          </Box>

          {/* 表单字段 */}
          <TextField
            label="标题"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            fullWidth
          />

          <TextField
            label="描述"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            multiline
            rows={4}
            placeholder="剧集的详细描述（可选）"
            fullWidth
          />

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            <TextField
              label="排序序号"
              type="number"
              value={formData.sortOrder.toString()}
              onChange={(e) =>
                setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
              }
              placeholder="用于自定义排序"
              fullWidth
            />

            <TextField
              label="发布时间"
              type="datetime-local"
              value={formatDateForInput(formData.pubDate)}
              onChange={(e) =>
                setFormData({ ...formData, pubDate: new Date(e.target.value) })
              }
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          variant="text"
          startIcon={<Delete />}
          onClick={handleDelete}
          color="error"
          sx={{ mr: 'auto' }}
        >
          删除剧集
        </Button>
        <Button variant="outlined" onClick={onClose}>
          关闭
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={isSaving}>
          {isSaving ? '保存中...' : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
