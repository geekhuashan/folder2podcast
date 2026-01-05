/**
 * 排序预览对话框组件 - MUI 版本
 */

'use client';

import type { ReorderPreview } from '@/lib/utils/episode-sorter';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

interface ReorderPreviewModalProps {
  preview: ReorderPreview;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ReorderPreviewModal({
  preview,
  onConfirm,
  onCancel,
}: ReorderPreviewModalProps) {
  const getStrategyName = (strategy: string): string => {
    const names: Record<string, string> = {
      prefix: '前缀数字（01-标题）',
      suffix: '后缀数字（标题-01）',
      first: '第一个数字',
      last: '最后一个数字',
      date: '日期格式（2024-01-15）',
    };
    return names[strategy] || strategy;
  };

  return (
    <Dialog open={true} onClose={onCancel} maxWidth="md" fullWidth>
      <DialogTitle>排序预览 - {getStrategyName(preview.strategy)}</DialogTitle>
      <Box sx={{ px: 3, mb: 2, display: 'flex', gap: 1.5 }}>
        <Chip label={`总共 ${preview.total} 个剧集`} color="info" />
        {preview.changed > 0 ? (
          <Chip label={`${preview.changed} 个排名将改变`} color="warning" />
        ) : (
          <Chip label="排序无变化" color="success" />
        )}
      </Box>

      <DialogContent sx={{ overflowY: 'auto', maxHeight: 'calc(90vh - 200px)' }}>
        <Stack spacing={1}>
          {preview.episodes.map((ep) => (
            <Box
              key={ep.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1.5,
                borderRadius: 0.5,
                border: 1,
                borderColor: ep.changed ? 'warning.main' : 'divider',
                bgcolor: ep.changed ? 'warning.lighter' : 'background.paper',
              }}
            >
              {/* 新序号 */}
              <Box sx={{ flexShrink: 0, width: 48, textAlign: 'center' }}>
                <Box
                  sx={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '1.125rem',
                  }}
                >
                  #{ep.newSortOrder}
                </Box>
              </Box>

              {/* 剧集信息 */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box
                  sx={{
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {ep.title}
                </Box>
                <Box
                  sx={{
                    fontSize: '0.6875rem',
                    color: 'text.secondary',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {ep.fileName}
                </Box>
              </Box>

              {/* 变化状态 */}
              <Box sx={{ flexShrink: 0 }}>
                {ep.changed ? (
                  <Chip
                    label={`#${ep.oldSortOrder} → #${ep.newSortOrder}`}
                    color="warning"
                    size="small"
                  />
                ) : (
                  <Chip label="不变" variant="outlined" size="small" />
                )}
              </Box>
            </Box>
          ))}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button variant="outlined" onClick={onCancel}>
          取消
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={preview.changed === 0}
        >
          {preview.changed > 0 ? `确认应用（${preview.changed} 个改变）` : '无需应用'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
