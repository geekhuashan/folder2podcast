/**
 * 文件上传组件 - MUI 版本
 * 支持拖拽上传、多文件上传
 */

'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadAPI } from '@/lib/api/client';
import type { Podcast } from '@/lib/types';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Upload from '@mui/icons-material/Upload';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Cancel from '@mui/icons-material/Cancel';

interface FileUploadProps {
  podcast: Podcast;
  onUploadSuccess?: () => void;
  onUploadError?: (error: string) => void;
}

interface UploadProgress {
  fileName: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export default function FileUpload({ podcast, onUploadSuccess, onUploadError }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadProgress[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      // 过滤出音频文件
      const audioFiles = files.filter(file =>
        file.type.startsWith('audio/') ||
        /\.(mp3|m4a|wav|flac|ogg|aac)$/i.test(file.name)
      );

      if (audioFiles.length === 0) {
        onUploadError?.('没有找到音频文件');
        return;
      }

      // 初始化上传队列
      const queue: UploadProgress[] = audioFiles.map(file => ({
        fileName: file.name,
        status: 'pending',
      }));

      setUploadQueue(queue);
      setUploading(true);
      setCurrentIndex(0);

      // 逐个上传
      for (let i = 0; i < audioFiles.length; i++) {
        setCurrentIndex(i);
        setUploadQueue(prev =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: 'uploading' } : item
          )
        );

        try {
          const response = await uploadAPI.uploadAudio(audioFiles[i], podcast.id);

          if (response.status === 'success') {
            setUploadQueue(prev =>
              prev.map((item, idx) =>
                idx === i ? { ...item, status: 'success' } : item
              )
            );
          } else {
            const errorMsg = response.status === 'error' ? response.message : '上传失败';
            setUploadQueue(prev =>
              prev.map((item, idx) =>
                idx === i ? { ...item, status: 'error', error: errorMsg } : item
              )
            );
          }
        } catch (error) {
          console.error('Upload error:', error);
          setUploadQueue(prev =>
            prev.map((item, idx) =>
              idx === i ? { ...item, status: 'error', error: '上传失败' } : item
            )
          );
        }
      }

      setUploading(false);

      // 等待一会儿后刷新页面
      setTimeout(() => {
        onUploadSuccess?.();
        setUploadQueue([]);
        setCurrentIndex(0);
      }, 2000);
    },
    [podcast.id, onUploadSuccess, onUploadError]
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      uploadFiles(acceptedFiles);
    },
    [uploadFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.m4a', '.wav', '.flac', '.ogg', '.aac'],
    },
    multiple: true,
    disabled: uploading,
  });

  const successCount = uploadQueue.filter(item => item.status === 'success').length;
  const errorCount = uploadQueue.filter(item => item.status === 'error').length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
      {/* 上传区域 */}
      <Box
        {...getRootProps()}
        sx={{
          border: 2,
          borderStyle: 'dashed',
          borderColor: isDragActive ? 'primary.main' : 'divider',
          borderRadius: 1,
          p: 4,
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          bgcolor: isDragActive ? 'action.hover' : 'background.default',
          opacity: uploading ? 0.6 : 1,
          transition: 'all 0.2s ease',
        }}
      >
        <input {...getInputProps()} />

        {uploading && uploadQueue.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, alignItems: 'center' }}>
            <CircularProgress />
            <Box sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
              正在上传 {currentIndex + 1}/{uploadQueue.length}
            </Box>
            <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              {uploadQueue[currentIndex]?.fileName}
            </Box>
            <Box sx={{ fontSize: '0.6875rem', color: 'text.disabled' }}>
              成功: {successCount} | 失败: {errorCount}
            </Box>
          </Box>
        ) : isDragActive ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
            <Upload sx={{ fontSize: 48, color: 'primary.main' }} />
            <Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'primary.main' }}>
              释放以上传文件
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
            <Upload sx={{ fontSize: 48, color: 'text.disabled' }} />
            <Box>
              <Box sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                拖拽音频文件到这里
              </Box>
              <Box sx={{ mt: 0.5, fontSize: '0.75rem', color: 'text.secondary' }}>
                或点击选择多个文件
              </Box>
            </Box>
            <Box sx={{ mt: 1, fontSize: '0.6875rem', color: 'text.disabled' }}>
              支持: MP3, M4A, WAV, FLAC, OGG, AAC
            </Box>
          </Box>
        )}
      </Box>

      {/* 上传队列显示 */}
      {uploadQueue.length > 0 && !uploading && (
        <Box
          sx={{
            maxHeight: 240,
            overflowY: 'auto',
            borderRadius: 1,
            border: 1,
            borderColor: 'divider',
            bgcolor: 'background.default',
          }}
        >
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.875rem',
                fontWeight: 600,
                mb: 1.5,
              }}
            >
              <span>上传结果</span>
              <Box component="span" sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>
                ✓ {successCount} / ✗ {errorCount} / 共 {uploadQueue.length}
              </Box>
            </Box>
            {uploadQueue.map((item, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem',
                  p: 1,
                  borderRadius: 0.5,
                  bgcolor: 'background.paper',
                }}
              >
                <Box
                  component="span"
                  sx={{
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.fileName}
                </Box>
                <Box component="span" sx={{ ml: 1 }}>
                  {item.status === 'success' && <CheckCircle sx={{ color: 'success.main', fontSize: 16 }} />}
                  {item.status === 'error' && <Cancel sx={{ color: 'error.main', fontSize: 16 }} />}
                  {item.status === 'pending' && <Box component="span" sx={{ color: 'text.disabled' }}>⋯</Box>}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
