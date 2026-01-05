/**
 * 首页 - 播客列表页面 - MUI 版本
 */

'use client';

import { useState } from 'react';
import { usePodcasts } from '@/lib/hooks/use-api';
import { useAppStore } from '@/lib/store/app';
import { podcastsAPI, uploadAPI, accessKeyManager } from '@/lib/api/client';
import { chineseToPinyin } from '@/lib/utils/pinyin';
import { showAlert, showConfirm } from '@/lib/stores/dialog';
import AccessKeyInput from '@/components/AccessKeyInput';
import PodcastCard from '@/components/PodcastCard';
import PodcastForm from '@/components/PodcastForm';
import FileUpload from '@/components/FileUpload';
import UploadProgressModal from '@/components/UploadProgressModal';
import type { Podcast } from '@/lib/types';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';
import Add from '@mui/icons-material/Add';
import DriveFolderUpload from '@mui/icons-material/DriveFolderUpload';
import Mic from '@mui/icons-material/Mic';
import Cancel from '@mui/icons-material/Cancel';
import Logout from '@mui/icons-material/Logout';

export default function HomePage() {
  const { isAuthenticated, username, setAuthenticated } = useAppStore();
  const { podcasts, isLoading, error, mutate } = usePodcasts();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPodcast, setEditingPodcast] = useState<Podcast | null>(null);
  const [uploadPodcast, setUploadPodcast] = useState<Podcast | null>(null);

  // 文件夹上传进度状态
  const [folderUploadState, setFolderUploadState] = useState<{
    isOpen: boolean;
    title: string;
    currentFile: string;
    progress: number;
    total: number;
    isComplete: boolean;
  }>({
    isOpen: false,
    title: '',
    currentFile: '',
    progress: 0,
    total: 0,
    isComplete: false,
  });

  const [isDragging, setIsDragging] = useState(false);

  const handleCreateSuccess = () => {
    setShowCreateDialog(false);
    mutate();
  };

  const handleEditSuccess = () => {
    setEditingPodcast(null);
    mutate();
  };

  const handleDelete = async (podcast: Podcast) => {
    const deleteFiles = await showConfirm('是否同时删除文件？（取消则仅删除数据库记录）');

    const response = await podcastsAPI.delete(podcast.username, podcast.dirName, deleteFiles);

    if (response.status === 'success') {
      mutate();
    } else {
      const errorMsg = response.status === 'error' ? response.message : '删除失败';
      await showAlert(errorMsg, '错误');
    }
  };

  const handleLogout = () => {
    accessKeyManager.clear();
    setAuthenticated(false);
  };

  const handleUploadSuccess = () => {
    setUploadPodcast(null);
    mutate();
  };

  // 处理文件上传的核心逻辑（供文件夹选择和拖拽共用）
  const processFilesUpload = async (items: DataTransferItemList | FileList) => {
    let files: File[] = [];
    let folderName = '';

    // 处理拖拽的文件
    if ('DataTransferItemList' in window && items instanceof DataTransferItemList) {
      const entries: any[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry?.();
          if (entry) {
            entries.push(entry);
          }
        }
      }

      // 读取文件夹内容
      if (entries.length > 0 && entries[0].isDirectory) {
        folderName = entries[0].name;
        files = await readDirectory(entries[0]);
      }
    } else {
      // 处理文件输入选择的文件
      const fileList = Array.from(items as FileList);
      if (fileList.length > 0) {
        const firstFile = fileList[0] as File & { webkitRelativePath?: string };
        const pathParts = firstFile.webkitRelativePath?.split('/') || [];
        folderName = pathParts[0] || '未命名文件夹';
        files = fileList;
      }
    }

    if (!folderName) {
      await showAlert('无法获取文件夹名称', '错误');
      return;
    }

    const audioExtensions = ['.mp3', '.m4a', '.wav', '.aac', '.ogg', '.flac', '.wma'];
    const audioFiles = files.filter((file) => {
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      return audioExtensions.includes(ext);
    });

    if (audioFiles.length === 0) {
      await showAlert('所选文件夹中没有音频文件', '错误');
      return;
    }

    try {
      // 显示进度模态框
      setFolderUploadState({
        isOpen: true,
        title: folderName,
        currentFile: '正在创建播客...',
        progress: 0,
        total: audioFiles.length,
        isComplete: false,
      });

      // 将中文文件夹名转换为拼音作为 dirName
      const dirName = chineseToPinyin(folderName);
      const finalDirName = dirName || `podcast-${Date.now()}`;

      const createResponse = await podcastsAPI.create({
        dirName: finalDirName,
        title: folderName,
        description: `从文件夹"${folderName}"上传的播客`,
        author: folderName,
      });

      if (createResponse.status !== 'success') {
        setFolderUploadState(prev => ({ ...prev, isOpen: false }));
        const errorMsg = createResponse.status === 'error' ? createResponse.message : '创建播客失败';
        await showAlert(errorMsg, '错误');
        return;
      }

      const podcastId = createResponse.data.id;

      let successCount = 0;
      for (let i = 0; i < audioFiles.length; i++) {
        const file = audioFiles[i];

        // 更新进度
        setFolderUploadState(prev => ({
          ...prev,
          currentFile: file.name,
          progress: i,
        }));

        try {
          const uploadResponse = await uploadAPI.uploadAudio(file, podcastId);
          if (uploadResponse.status === 'success') {
            successCount++;
          }
        } catch (error) {
          console.error(`文件 ${file.name} 上传失败:`, error);
        }
      }

      // 完成
      setFolderUploadState(prev => ({
        ...prev,
        progress: successCount,
        isComplete: true,
        currentFile: '',
      }));

      mutate();
    } catch (error) {
      console.error('文件夹上传失败:', error);
      setFolderUploadState(prev => ({ ...prev, isOpen: false }));
      await showAlert('文件夹上传失败，请重试', '错误');
    }
  };

  // 读取文件夹内容（递归）
  const readDirectory = async (dirEntry: any): Promise<File[]> => {
    const files: File[] = [];
    const reader = dirEntry.createReader();

    const readEntries = (): Promise<any[]> => {
      return new Promise((resolve, reject) => {
        reader.readEntries(resolve, reject);
      });
    };

    let entries = await readEntries();
    while (entries.length > 0) {
      for (const entry of entries) {
        if (entry.isFile) {
          const file: File = await new Promise((resolve, reject) => {
            entry.file(resolve, reject);
          });
          files.push(file);
        } else if (entry.isDirectory) {
          const subFiles = await readDirectory(entry);
          files.push(...subFiles);
        }
      }
      entries = await readEntries();
    }

    return files;
  };

  // 处理文件夹上传
  const handleFolderUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    await processFilesUpload(files);
    event.target.value = '';
  };

  // 处理拖拽事件
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!e.dataTransfer.items) return;

    await processFilesUpload(e.dataTransfer.items);
  };

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
        <Container maxWidth="xl">
          <Box sx={{ py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Box component="h1" sx={{ m: 0, fontSize: '1.25rem', fontWeight: 600 }}>
                Folder2Podcast
              </Box>
              <Box sx={{ mt: 0.25, fontSize: '0.6875rem', color: 'text.secondary' }}>
                音频转播客
              </Box>
            </Box>
            {isAuthenticated && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box component="span" sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>
                  <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    {username || '用户'}
                  </Box>
                </Box>
                <Button
                  size="small"
                  variant="text"
                  startIcon={<Logout />}
                  onClick={handleLogout}
                  color="error"
                >
                  退出
                </Button>
              </Box>
            )}
          </Box>
        </Container>
      </Box>

      {/* 主内容 */}
      <Container
        component="main"
        maxWidth="xl"
        sx={{ py: 2, position: 'relative' }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Access Key 输入 */}
        {!isAuthenticated && (
          <Box sx={{ mb: 3, maxWidth: 448, mx: 'auto' }}>
            <AccessKeyInput />
          </Box>
        )}

        {/* 仅在认证后显示内容 */}
        {isAuthenticated && (
          <>
            <input
              type="file"
              id="folderInput"
              {...({ webkitdirectory: '', directory: '' } as any)}
              multiple
              style={{ display: 'none' }}
              onChange={handleFolderUpload}
              accept="audio/*"
            />

            {/* 拖拽覆盖层 */}
            {isDragging && (
              <Box
                sx={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  bgcolor: 'rgba(0, 120, 212, 0.1)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 50,
                  pointerEvents: 'none',
                }}
              >
                <Box
                  sx={{
                    p: '32px 48px',
                    borderRadius: 1.5,
                    bgcolor: 'background.paper',
                    border: 3,
                    borderStyle: 'dashed',
                    borderColor: 'primary.main',
                    boxShadow: 8,
                    textAlign: 'center',
                  }}
                >
                  <DriveFolderUpload sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                  <Box sx={{ fontSize: '1.125rem', fontWeight: 600, mb: 1 }}>
                    拖放文件夹到这里
                  </Box>
                  <Box sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                    将自动创建播客并上传所有音频文件
                  </Box>
                </Box>
              </Box>
            )}

            {/* 操作按钮 */}
            <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setShowCreateDialog(true)}
              >
                创建播客
              </Button>
              <Button
                variant="contained"
                color="success"
                startIcon={<DriveFolderUpload />}
                onClick={() => document.getElementById('folderInput')?.click()}
                disabled={folderUploadState.isOpen}
              >
                上传文件夹
              </Button>
            </Box>

            {/* 播客列表 */}
            {isLoading ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <CircularProgress size={48} />
                <Box sx={{ mt: 1.5, fontSize: '0.75rem', color: 'text.secondary' }}>
                  加载中...
                </Box>
              </Box>
            ) : error ? (
              <Box
                sx={{
                  textAlign: 'center',
                  py: 8,
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                }}
              >
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
                  加载失败: {error.message}
                </Box>
              </Box>
            ) : podcasts && podcasts.length > 0 ? (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: 2,
                }}
              >
                {podcasts.map((podcast) => (
                  <PodcastCard
                    key={podcast.id}
                    podcast={podcast}
                    onSelect={(p) =>
                      (window.location.href = `/podcasts/${p.username}/${encodeURIComponent(
                        p.dirName
                      )}`)
                    }
                    onEdit={setEditingPodcast}
                    onDelete={handleDelete}
                    onUpload={setUploadPodcast}
                  />
                ))}
              </Box>
            ) : (
              <Box
                sx={{
                  textAlign: 'center',
                  py: 8,
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
                  <Mic sx={{ fontSize: 48, color: 'text.disabled' }} />
                </Box>
                <Box sx={{ mt: 2, fontSize: '0.875rem', fontWeight: 600 }}>
                  暂无播客
                </Box>
                <Box sx={{ mt: 0.5, fontSize: '0.6875rem', color: 'text.secondary' }}>
                  点击上方按钮创建第一个播客
                </Box>
              </Box>
            )}
          </>
        )}
      </Container>

      {/* 创建播客对话框 */}
      <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>创建新播客</DialogTitle>
        <DialogContent>
          <PodcastForm
            onSuccess={handleCreateSuccess}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* 编辑播客对话框 */}
      <Dialog open={!!editingPodcast} onClose={() => setEditingPodcast(null)} maxWidth="md" fullWidth>
        <DialogTitle>编辑播客</DialogTitle>
        <DialogContent>
          {editingPodcast && (
            <PodcastForm
              podcast={editingPodcast}
              onSuccess={handleEditSuccess}
              onCancel={() => setEditingPodcast(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 上传文件对话框 */}
      <Dialog open={!!uploadPodcast} onClose={() => setUploadPodcast(null)} maxWidth="sm" fullWidth>
        <DialogTitle>上传音频 - {uploadPodcast?.title}</DialogTitle>
        <DialogContent>
          {uploadPodcast && (
            <>
              <FileUpload
                podcast={uploadPodcast}
                onUploadSuccess={handleUploadSuccess}
                onUploadError={async (error) => await showAlert(error, '上传错误')}
              />
              <Button
                variant="outlined"
                onClick={() => setUploadPodcast(null)}
                fullWidth
                sx={{ mt: 2 }}
              >
                关闭
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 文件夹上传进度模态框 */}
      <UploadProgressModal
        isOpen={folderUploadState.isOpen}
        title={folderUploadState.title}
        currentFile={folderUploadState.currentFile}
        progress={folderUploadState.progress}
        total={folderUploadState.total}
        isComplete={folderUploadState.isComplete}
        onClose={() => setFolderUploadState(prev => ({ ...prev, isOpen: false }))}
      />
    </Box>
  );
}
