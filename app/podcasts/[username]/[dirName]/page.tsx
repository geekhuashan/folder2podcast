/**
 * 播客详情页面 - MUI 版本
 */

'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePodcast, useEpisodes } from '@/lib/hooks/use-api';
import { podcastsAPI, episodesAPI } from '@/lib/api/client';
import { showAlert, showConfirm } from '@/lib/stores/dialog';
import EpisodeList from '@/components/EpisodeList';
import FileUpload from '@/components/FileUpload';
import PodcastForm from '@/components/PodcastForm';
import ReorderPreviewModal from '@/components/ReorderPreviewModal';
import { copyToClipboard } from '@/lib/utils/clipboard';
import { getAllStrategies, type SortStrategy, type ReorderPreview } from '@/lib/utils/episode-sorter';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Mic from '@mui/icons-material/Mic';
import Upload from '@mui/icons-material/Upload';
import Edit from '@mui/icons-material/Edit';
import Delete from '@mui/icons-material/Delete';
import ContentCopy from '@mui/icons-material/ContentCopy';
import Check from '@mui/icons-material/Check';
import Cancel from '@mui/icons-material/Cancel';
import Image from '@mui/icons-material/Image';
import Description from '@mui/icons-material/Description';

export default function PodcastDetailPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const dirName = decodeURIComponent(params.dirName as string);

  const { podcast, isLoading: podcastLoading, error: podcastError, mutate: mutatePodcast } = usePodcast(username, dirName);
  const { episodes, isLoading: episodesLoading, mutate: mutateEpisodes } = useEpisodes(username, dirName);

  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  // 排序相关状态
  const [sortStrategy, setSortStrategy] = useState<SortStrategy>('prefix');
  const [reorderPreview, setReorderPreview] = useState<ReorderPreview | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  // 切换继承设置
  const handleToggleInheritance = async () => {
    if (!podcast) return;

    const newValue = !podcast.inheritanceEnabled;
    const confirmMessage = newValue
      ? '确定要启用剧集继承吗？启用后，所有剧集将使用播客的封面、作者等设置。'
      : '确定要禁用剧集继承吗？禁用后，可以为每一集单独设置封面、描述等信息。';

    const confirmed = await showConfirm(confirmMessage);
    if (!confirmed) {
      return;
    }

    try {
      const response = await podcastsAPI.update(username, podcast.dirName, {
        inheritanceEnabled: newValue,
      });

      if (response.status === 'success') {
        mutatePodcast();
      } else {
        const errorMsg = response.status === 'error' ? response.message : '更新失败';
        await showAlert(errorMsg, '错误');
      }
    } catch (error) {
      console.error('[Toggle Inheritance] Error:', error);
      await showAlert('更新失败，请重试', '错误');
    }
  };

  // 计算数据完整性统计
  const getDataStats = () => {
    if (!episodes || episodes.length === 0) {
      return { cover: 0, description: 0, total: 0 };
    }

    const coverCount = episodes.filter(ep => ep.imageUrl || ep.coverFileName).length;
    const descriptionCount = episodes.filter(ep => ep.description).length;

    return {
      cover: coverCount,
      description: descriptionCount,
      total: episodes.length,
    };
  };

  const stats = getDataStats();

  const handleCopy = async () => {
    if (!podcast) return;
    const success = await copyToClipboard(podcast.feedUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleUploadSuccess = () => {
    setShowUploadDialog(false);
    mutateEpisodes();
  };

  const handleEditSuccess = () => {
    setShowEditDialog(false);
    mutatePodcast();
  };

  const handleDelete = async () => {
    if (!podcast) return;

    const confirmed = await showConfirm(`确定要删除播客 "${podcast.title}" 吗？`);
    if (!confirmed) {
      return;
    }

    const deleteFiles = await showConfirm('是否同时删除文件？（取消则仅删除数据库记录）');

    const response = await podcastsAPI.delete(username, podcast.dirName, deleteFiles);

    if (response.status === 'success') {
      router.push('/');
    } else {
      const errorMsg = response.status === 'error' ? response.message : '删除失败';
      await showAlert(errorMsg, '错误');
    }
  };

  // 排序预览
  const handleReorderPreview = async () => {
    if (!episodes || episodes.length === 0) {
      await showAlert('没有剧集可以排序', '提示');
      return;
    }

    setIsReordering(true);

    try {
      const response = await episodesAPI.reorderPreview(username, dirName, sortStrategy);

      if (response.status === 'success') {
        setReorderPreview(response.data);
      } else {
        const errorMsg = response.status === 'error' ? response.message : '预览失败';
        await showAlert(errorMsg, '错误');
      }
    } catch (error) {
      console.error('[Reorder Preview] Error:', error);
      await showAlert('预览失败，请重试', '错误');
    } finally {
      setIsReordering(false);
    }
  };

  // 应用排序
  const handleReorderApply = async () => {
    if (!reorderPreview) return;

    setIsReordering(true);

    try {
      const response = await episodesAPI.reorderApply(username, dirName, sortStrategy);

      if (response.status === 'success') {
        setReorderPreview(null);
        mutateEpisodes(); // 刷新剧集列表
        await showAlert(`排序已应用！共 ${response.data.changed} 个剧集的排序发生了变化。`, '成功');
      } else {
        const errorMsg = response.status === 'error' ? response.message : '应用失败';
        await showAlert(errorMsg, '错误');
      }
    } catch (error) {
      console.error('[Reorder Apply] Error:', error);
      await showAlert('应用失败，请重试', '错误');
    } finally {
      setIsReordering(false);
    }
  };

  if (podcastLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={48} />
          <Box sx={{ mt: 1.5, fontSize: '0.75rem', color: 'text.secondary' }}>加载中...</Box>
        </Box>
      </Box>
    );
  }

  if (podcastError || !podcast) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <Box sx={{ textAlign: 'center', borderRadius: 1, p: 3, bgcolor: 'background.paper' }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 1,
              display: 'inline-block',
              bgcolor: 'error.lighter',
            }}
          >
            <Cancel sx={{ fontSize: 40, color: 'error.main' }} />
          </Box>
          <Box sx={{ mt: 1.5, fontSize: '0.75rem', color: 'error.main' }}>
            加载失败: {podcastError?.message || '播客不存在'}
          </Box>
          <Button
            variant="contained"
            onClick={() => router.push('/')}
            sx={{ mt: 2 }}
          >
            返回首页
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* 头部 */}
      <Box
        component="header"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          backdropFilter: 'blur(20px)',
          bgcolor: 'rgba(255, 255, 255, 0.9)',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Container maxWidth="xl" sx={{ py: 1.5 }}>
          {/* 第一行：返回 + 封面 + 标题信息 + 操作按钮 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
            {/* 返回按钮 */}
            <Button
              size="small"
              variant="text"
              startIcon={<ArrowBack />}
              onClick={() => router.push('/')}
              sx={{ minWidth: 'auto' }}
            >
              返回
            </Button>

            {/* 封面 */}
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 1,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                bgcolor: 'action.hover',
                boxShadow: 1,
              }}
            >
              {podcast.imageUrl ? (
                <Box
                  component="img"
                  src={podcast.imageUrl}
                  alt={podcast.title}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <Mic sx={{ fontSize: 28, color: 'text.disabled' }} />
              )}
            </Box>

            {/* 标题和作者 */}
            <Box sx={{ flex: 1, minWidth: 0, maxWidth: { xs: '100%', sm: '300px' } }}>
              <Box
                component="h1"
                sx={{
                  m: 0,
                  fontSize: { xs: '1rem', sm: '1.125rem' },
                  fontWeight: 700,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {podcast.title}
              </Box>
              <Box
                sx={{
                  mt: 0.25,
                  fontSize: '0.6875rem',
                  color: 'text.secondary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {podcast.author} · {episodes?.length || 0} 集
              </Box>
            </Box>

            {/* 操作按钮 */}
            <Box sx={{ display: 'flex', gap: 0.75, flexShrink: 0, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
              <Button
                size="small"
                variant="contained"
                startIcon={<Upload />}
                onClick={() => setShowUploadDialog(true)}
                sx={{ minWidth: { xs: 64, sm: 80 } }}
              >
                上传
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Edit />}
                onClick={() => setShowEditDialog(true)}
                sx={{ minWidth: { xs: 64, sm: 80 } }}
              >
                编辑
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<ContentCopy />}
                onClick={handleCopy}
                color={copied ? 'success' : 'primary'}
                sx={{ minWidth: { xs: 64, sm: 80 } }}
              >
                {copied ? '✓' : 'RSS'}
              </Button>
              <Button
                size="small"
                variant="text"
                startIcon={<Delete />}
                onClick={handleDelete}
                color="error"
                sx={{ minWidth: { xs: 64, sm: 80 } }}
              >
                删除
              </Button>
            </Box>
          </Box>

          {/* 第二行：继承设置 + 数据统计 + 排序工具 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.6875rem', flexWrap: 'wrap' }}>
            {/* 继承开关 */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                px: 1,
                py: 0.5,
                borderRadius: 0.5,
                bgcolor: 'action.hover',
              }}
            >
              <Box component="span" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.6875rem' }}>剧集设置:</Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={podcast.inheritanceEnabled}
                    onChange={handleToggleInheritance}
                    size="small"
                  />
                }
                label={podcast.inheritanceEnabled ? '统一使用播客设置' : '每集独立设置'}
                sx={{
                  m: 0,
                  '& .MuiFormControlLabel-label': {
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                  },
                }}
              />
            </Box>

            {/* 数据完整性统计（仅在禁用继承时显示） */}
            {stats.total > 0 && !podcast.inheritanceEnabled && (
              <>
                <Chip
                  icon={<Image />}
                  label={`封面 ${stats.cover}/${stats.total}`}
                  size="small"
                  color={stats.cover === stats.total ? 'success' : 'default'}
                  sx={{ height: 24, fontSize: '0.6875rem' }}
                />
                <Chip
                  icon={<Description />}
                  label={`描述 ${stats.description}/${stats.total}`}
                  size="small"
                  color={stats.description === stats.total ? 'success' : 'default'}
                  sx={{ height: 24, fontSize: '0.6875rem' }}
                />
              </>
            )}

            {/* 排序工具 */}
            {episodes && episodes.length > 0 && (
              <>
                <Box component="span" sx={{ fontWeight: 600, color: 'text.secondary', ml: 0.5 }}>排序:</Box>
                <Select
                  value={sortStrategy}
                  onChange={(e) => setSortStrategy(e.target.value as SortStrategy)}
                  disabled={isReordering}
                  size="small"
                  sx={{
                    minWidth: 100,
                    height: 28,
                    '& .MuiSelect-select': {
                      py: 0.5,
                      fontSize: '0.6875rem',
                    },
                  }}
                >
                  {getAllStrategies().map((strategy) => (
                    <MenuItem key={strategy.value} value={strategy.value}>
                      {strategy.label}
                    </MenuItem>
                  ))}
                </Select>
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleReorderPreview}
                  disabled={isReordering}
                  sx={{ height: 28, minWidth: 60, fontSize: '0.6875rem' }}
                >
                  {isReordering ? '处理中...' : '应用'}
                </Button>
              </>
            )}
          </Box>
        </Container>
      </Box>

      {/* 主内容 */}
      <Container component="main" maxWidth="xl" sx={{ py: { xs: 1.5, sm: 2 } }}>
        {/* 剧集列表标题 */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, mt: 1 }}>
          <Box component="h2" sx={{ m: 0, fontSize: { xs: '1rem', sm: '1.125rem' }, fontWeight: 600 }}>
            剧集 {episodes && <Box component="span" sx={{ color: 'text.secondary' }}>({episodes.length})</Box>}
          </Box>
        </Box>

        {/* 剧集列表 */}
        {episodesLoading ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <CircularProgress size={48} />
            <Box sx={{ mt: 1.5, fontSize: '0.75rem', color: 'text.secondary' }}>加载中...</Box>
          </Box>
        ) : (
          <EpisodeList episodes={episodes || []} podcast={podcast} onEpisodeChanged={mutateEpisodes} />
        )}
      </Container>

      {/* 上传对话框 */}
      <Dialog open={showUploadDialog} onClose={() => setShowUploadDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>上传音频</DialogTitle>
        <DialogContent>
          <FileUpload
            podcast={podcast}
            onUploadSuccess={handleUploadSuccess}
            onUploadError={async (error) => await showAlert(error, '上传错误')}
          />
          <Button
            variant="outlined"
            onClick={() => setShowUploadDialog(false)}
            fullWidth
            sx={{ mt: 2 }}
          >
            关闭
          </Button>
        </DialogContent>
      </Dialog>

      {/* 编辑对话框 */}
      <Dialog open={showEditDialog} onClose={() => setShowEditDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>编辑播客</DialogTitle>
        <DialogContent>
          <PodcastForm
            podcast={podcast}
            onSuccess={handleEditSuccess}
            onCancel={() => setShowEditDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* 排序预览对话框 */}
      {reorderPreview && (
        <ReorderPreviewModal
          preview={reorderPreview}
          onConfirm={handleReorderApply}
          onCancel={() => setReorderPreview(null)}
        />
      )}
    </Box>
  );
}
