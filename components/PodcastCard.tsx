/**
 * 播客卡片组件 - MUI 版本
 */

'use client';

import { useState } from 'react';
import type { Podcast } from '@/lib/types';
import { copyToClipboard } from '@/lib/utils/clipboard';
import { showConfirm } from '@/lib/stores/dialog';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Mic from '@mui/icons-material/Mic';
import ContentCopy from '@mui/icons-material/ContentCopy';
import Check from '@mui/icons-material/Check';
import Upload from '@mui/icons-material/Upload';
import Edit from '@mui/icons-material/Edit';
import Delete from '@mui/icons-material/Delete';

interface PodcastCardProps {
  podcast: Podcast;
  onSelect?: (podcast: Podcast) => void;
  onEdit?: (podcast: Podcast) => void;
  onDelete?: (podcast: Podcast) => void;
  onUpload?: (podcast: Podcast) => void;
}

export default function PodcastCard({
  podcast,
  onSelect,
  onEdit,
  onDelete,
  onUpload,
}: PodcastCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(podcast.feedUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card
      sx={{ cursor: 'pointer' }}
      onClick={() => onSelect?.(podcast)}
    >
      {/* 封面区域 */}
      {podcast.imageUrl && (
        <CardMedia
          component="img"
          image={podcast.imageUrl}
          alt={podcast.title}
          sx={{ height: 140, objectFit: 'cover' }}
        />
      )}

      {/* 头部和内容 */}
      <CardContent>
        {/* 标题区域 */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
          {!podcast.imageUrl && (
            <Box
              sx={{
                width: 56,
                height: 56,
                bgcolor: 'action.hover',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Mic sx={{ fontSize: 28, color: 'text.disabled' }} />
            </Box>
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box
              component="h3"
              sx={{
                m: 0,
                mb: 0.5,
                fontSize: '0.875rem',
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {podcast.title}
            </Box>
            <Box
              component="p"
              sx={{
                m: 0,
                mb: 0.5,
                fontSize: '0.75rem',
                color: 'text.secondary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {podcast.author}
            </Box>
            <Box
              component="p"
              sx={{
                m: 0,
                fontSize: '0.6875rem',
                color: 'text.disabled',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {podcast.description}
            </Box>
          </Box>
        </Box>

        {/* RSS Feed 复制区 */}
        <Box
          sx={{
            mb: 1.5,
            p: 1,
            bgcolor: 'background.default',
            borderRadius: 0.5,
            border: 1,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              value={podcast.feedUrl}
              size="small"
              InputProps={{
                readOnly: true,
                sx: {
                  fontSize: '0.6875rem',
                  fontFamily: 'monospace',
                  '& input': {
                    p: 0.5,
                    cursor: 'text'
                  }
                }
              }}
              sx={{ flex: 1 }}
              onClick={(e) => {
                e.stopPropagation();
                const input = e.currentTarget.querySelector('input');
                input?.select();
              }}
            />
            <Button
              size="small"
              variant={copied ? 'contained' : 'outlined'}
              startIcon={copied ? <Check /> : <ContentCopy />}
              onClick={(e) => {
                e.stopPropagation();
                handleCopy();
              }}
            >
              {copied ? '已复制' : '复制RSS'}
            </Button>
          </Box>
        </Box>

        {/* 操作按钮 */}
        <Box
          sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0.75 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="contained"
            size="small"
            startIcon={<Upload />}
            onClick={(e) => {
              e.stopPropagation();
              onUpload?.(podcast);
            }}
          >
            上传
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Edit />}
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(podcast);
            }}
          >
            编辑
          </Button>
          <Button
            variant="text"
            size="small"
            color="error"
            startIcon={<Delete />}
            onClick={async (e) => {
              e.stopPropagation();
              const confirmed = await showConfirm('确定要删除这个播客吗？');
              if (confirmed) {
                onDelete?.(podcast);
              }
            }}
          >
            删除
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
