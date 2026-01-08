/**
 * 认证组件 - MUI 版本
 * 支持 Access Key 和密码登录两种方式
 */

'use client';

import { useState, useEffect } from 'react';
import { accessKeyManager, authAPI } from '@/lib/api/client';
import { useAppStore } from '@/lib/store/app';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';

export default function AccessKeyInput() {
  // Access Key 模式状态
  const [key, setKey] = useState('');

  // 密码登录模式状态
  const [selectedTab, setSelectedTab] = useState<number>(0); // 0: password, 1: accessKey
  const [inputUsername, setInputUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { isAuthenticated, setAuthenticated } = useAppStore();

  useEffect(() => {
    // 检查是否已有 Access Key 和用户名
    const existingKey = accessKeyManager.get();
    const existingUsername = accessKeyManager.getUsername();
    if (existingKey) {
      setKey(existingKey);
      setAuthenticated(true, existingUsername || undefined);
    }
  }, [setAuthenticated]);

  // Access Key 模式保存
  const handleSave = async () => {
    if (!key.trim()) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      // 使用 Access Key 获取用户信息
      const response = await authAPI.me(key.trim());

      if (response.status === 'success') {
        // 保存 Access Key 和 username
        accessKeyManager.set(key.trim(), response.data.username);
        setAuthenticated(true, response.data.username);
      } else {
        const errorMsg = response.status === 'error' ? response.message : 'Access Key 无效';
        setErrorMessage(errorMsg);
      }
    } catch (error) {
      setErrorMessage('验证失败，请检查 Access Key 是否正确');
      console.error('[Access Key 验证] Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 密码登录
  const handlePasswordLogin = async () => {
    setErrorMessage('');

    if (!inputUsername.trim() || !password.trim()) {
      setErrorMessage('请输入用户名和密码');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authAPI.login(inputUsername.trim(), password);

      if (response.status === 'success') {
        accessKeyManager.set(response.data.accessKey, response.data.username);
        setAuthenticated(true, response.data.username);
      } else {
        const errorMsg = response.status === 'error' ? response.message : '登录失败';
        setErrorMessage(errorMsg);
      }
    } catch (error) {
      setErrorMessage('登录失败，请重试');
      console.error('[密码登录] Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 注册账号
  const handleRegister = async () => {
    setErrorMessage('');

    if (!inputUsername.trim() || !password.trim()) {
      setErrorMessage('请输入用户名和密码');
      return;
    }

    // 验证密码格式
    if (!/^[a-zA-Z0-9]{4,6}$/.test(password)) {
      setErrorMessage('密码必须是4-6位字母或数字');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authAPI.register(inputUsername.trim(), password);

      if (response.status === 'success') {
        accessKeyManager.set(response.data.accessKey, response.data.username);
        setAuthenticated(true, response.data.username);
      } else if (response.status === 'fail') {
        const failData = response.data as any;
        setErrorMessage(failData.username || failData.password || '注册失败');
      } else {
        setErrorMessage(response.message || '注册失败');
      }
    } catch (error) {
      setErrorMessage('注册失败，请重试');
      console.error('[注册] Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
    setErrorMessage('');
  };

  // 已认证时不显示此组件
  if (isAuthenticated) {
    return null;
  }

  // 未认证状态 - 显示登录界面
  return (
    <Card sx={{ maxWidth: 448, mx: 'auto' }}>
      {/* Tab 切换 */}
      <Tabs value={selectedTab} onChange={handleTabChange}>
        <Tab label="密码登录" />
        <Tab label="Access Key" />
      </Tabs>

      <Box sx={{ p: 2 }}>
        {/* 错误提示 */}
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {errorMessage}
          </Alert>
        )}

        {/* Access Key 模式 */}
        {selectedTab === 1 && (
          <Stack spacing={1.5}>
            <Box component="h3" sx={{ m: 0, mb: 1, fontSize: '1rem', fontWeight: 600 }}>
              请输入 Access Key
            </Box>
            <Box sx={{ mb: 2, fontSize: '0.75rem', color: 'text.secondary' }}>
              通过用户名/密码登录获取 Access Key，或在开放注册模式下注册新账号
            </Box>
            <TextField
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="fp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              InputProps={{
                sx: {
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                },
              }}
              fullWidth
            />
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={!key.trim() || isLoading}
              fullWidth
            >
              {isLoading ? '验证中...' : '保存'}
            </Button>
          </Stack>
        )}

        {/* 密码登录模式 */}
        {selectedTab === 0 && (
          <Stack spacing={1.5}>
            <Box component="h3" sx={{ m: 0, mb: 1, fontSize: '1rem', fontWeight: 600 }}>
              账号密码登录
            </Box>
            <TextField
              label="用户名"
              value={inputUsername}
              onChange={(e) => setInputUsername(e.target.value)}
              placeholder="请输入用户名"
              fullWidth
            />
            <TextField
              label="密码（4-6位字母或数字）"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              inputProps={{ maxLength: 6 }}
              fullWidth
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 1 }}>
              <Button
                variant="contained"
                onClick={handlePasswordLogin}
                disabled={isLoading || !inputUsername.trim() || !password.trim()}
              >
                {isLoading ? '登录中...' : '登录'}
              </Button>
              <Button
                variant="contained"
                onClick={handleRegister}
                disabled={isLoading || !inputUsername.trim() || !password.trim()}
                sx={{ bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
              >
                {isLoading ? '注册中...' : '注册'}
              </Button>
            </Box>
          </Stack>
        )}
      </Box>
    </Card>
  );
}
