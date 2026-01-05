/**
 * 全局弹窗组件 - MUI 版本
 */

'use client';

import { useDialogStore } from '@/lib/stores/dialog';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';

export default function GlobalDialog() {
  const { isOpen, config } = useDialogStore();

  if (!config) return null;

  const handleClose = () => {
    if (config.type === 'alert') {
      config.onConfirm?.();
    } else {
      config.onCancel?.();
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      {config.title && <DialogTitle>{config.title}</DialogTitle>}

      <DialogContent>
        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {config.content}
        </div>
      </DialogContent>

      <DialogActions>
        {config.type === 'confirm' && (
          <Button onClick={config.onCancel}>
            {config.cancelText || '取消'}
          </Button>
        )}
        <Button onClick={config.onConfirm} variant="contained" autoFocus>
          {config.confirmText || '确定'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
