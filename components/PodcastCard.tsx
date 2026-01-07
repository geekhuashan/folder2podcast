/**
 * 播客卡片组件 - MUI 版本
 */

'use client';

import { useState } from 'react';
import type { Podcast } from '@/lib/types';
import { copyToClipboard } from '@/lib/utils/clipboard';
import { showConfirm } from '@/lib/stores/dialog';
import Card from '@mui/material/Card';
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
      sx={{
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
      onClick={() => onSelect?.(podcast)}
    >
      {/* 正方形封面区域 */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          paddingTop: '100%', // 1:1 宽高比，实现正方形
          bgcolor: 'action.hover',
          overflow: 'hidden',
        }}
      >
        {podcast.imageUrl ? (
          <Box
            component="img"
            src={podcast.imageUrl}
            alt={podcast.title}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Mic sx={{ fontSize: 64, color: 'text.disabled' }} />
          </Box>
        )}
      </Box>

      {/* 内容区域 */}
      <CardContent sx={{ pb: 2 }}>
        {/* 标题 */}
        <Box
          component="h3"
          sx={{
            m: 0,
            mb: 0.5,
            fontSize: '1rem',
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {podcast.title}
        </Box>

        {/* 作者 */}
        <Box
          sx={{
            mb: 1,
            fontSize: '0.75rem',
            color: 'text.secondary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {podcast.author}
        </Box>

        {/* 描述 */}
        <Box
          sx={{
            mb: 1.5,
            fontSize: '0.6875rem',
            color: 'text.disabled',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.4,
          }}
        >
          {podcast.description}
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
          onClick={(e) => e.stopPropagation()}
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
                const input = e.currentTarget.querySelector('input');
                input?.select();
              }}
            />
            <Button
              size="small"
              variant={copied ? 'contained' : 'outlined'}
              startIcon={copied ? <Check /> : <ContentCopy />}
              onClick={(e) => {
                handleCopy();
              }}
            >
              {copied ? '✓' : 'RSS'}
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
