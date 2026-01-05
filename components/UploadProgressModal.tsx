/**
 * 文件夹上传进度模态框 - MUI 版本
 */

'use client';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import Button from '@mui/material/Button';
import CheckCircle from '@mui/icons-material/CheckCircle';

interface UploadProgressModalProps {
  isOpen: boolean;
  title: string;
  currentFile?: string;
  progress: number;
  total: number;
  isComplete: boolean;
  onClose: () => void;
}

export default function UploadProgressModal({
  isOpen,
  title,
  currentFile,
  progress,
  total,
  isComplete,
  onClose,
}: UploadProgressModalProps) {
  const percentage = total > 0 ? (progress / total) * 100 : 0;

  return (
    <Dialog open={isOpen} maxWidth="sm" fullWidth disableEscapeKeyDown={!isComplete}>
      <DialogTitle>{isComplete ? '上传完成' : '正在上传...'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* 播客标题 */}
          <Box>
            <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 0.5 }}>
              播客名称
            </Box>
            <Box sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
              {title}
            </Box>
          </Box>

          {/* 进度条 */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Box component="span" sx={{ fontSize: '0.8125rem' }}>
                {isComplete ? '全部完成' : `正在上传 ${progress}/${total}`}
              </Box>
              <Box component="span" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                {Math.round(percentage)}%
              </Box>
            </Box>
            <LinearProgress variant="determinate" value={percentage} />
          </Box>

          {/* 当前文件 */}
          {!isComplete && currentFile && (
            <Box
              sx={{
                fontSize: '0.75rem',
                color: 'text.secondary',
                p: 1,
                bgcolor: 'background.default',
                borderRadius: 0.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {currentFile}
            </Box>
          )}

          {/* 完成提示 */}
          {isComplete && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 1.5,
                bgcolor: 'success.lighter',
                borderRadius: 0.5,
                color: 'success.main',
              }}
            >
              <CheckCircle sx={{ fontSize: 20 }} />
              <Box component="span" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                成功上传 {progress}/{total} 个文件
              </Box>
            </Box>
          )}

          {/* 关闭按钮 */}
          {isComplete && (
            <Button variant="contained" onClick={onClose} fullWidth>
              完成
            </Button>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
