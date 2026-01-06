/**
 * Folder2Podcast 官网页面
 * 路径: /about
 */

'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Link from 'next/link';
import {
  DriveFolderUpload,
  Dashboard,
  Api,
  RssFeed,
  Mic,
  School,
  Business,
  WorkspacePremium,
  CheckCircle,
  GitHub,
  Rocket,
  Speed,
  Security,
  Cloud
} from '@mui/icons-material';

export default function AboutPage() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  const features = [
    {
      icon: <DriveFolderUpload sx={{ fontSize: 48 }} />,
      title: '一键上传文件夹',
      description: '拖拽即创建播客，自动提取音频元数据，支持批量处理多个文件夹',
      color: '#2563EB',
      points: ['拖拽上传', '智能元数据提取', '批量创建', 'MP3/M4A/WAV等']
    },
    {
      icon: <Dashboard sx={{ fontSize: 48 }} />,
      title: 'Web 可视化管理',
      description: '基于 Material-UI 的现代化界面，轻松管理播客、剧集和封面',
      color: '#3B82F6',
      points: ['播客管理', '剧集编辑', '封面上传', '实时预览']
    },
    {
      icon: <Api sx={{ fontSize: 48 }} />,
      title: '强大的 HTTP API',
      description: '标准 RESTful 接口，轻松集成 n8n、Zapier 等自动化工具',
      color: '#F97316',
      points: ['RESTful API', 'OpenAPI文档', 'Access Key认证', '自动化集成']
    },
    {
      icon: <RssFeed sx={{ fontSize: 48 }} />,
      title: '标准 RSS Feed',
      description: '支持 Apple Podcasts、Spotify 等所有主流播客平台',
      color: '#10B981',
      points: ['RSS 2.0标准', 'iTunes扩展', '全平台兼容', '自动同步']
    },
  ];

  const useCases = [
    { icon: <Mic />, title: '个人播客创作', desc: '快速发布录音为播客' },
    { icon: <School />, title: '音频课程分发', desc: '教学音频转播客课程' },
    { icon: <Business />, title: '企业内部培训', desc: '管理培训音频材料' },
    { icon: <WorkspacePremium />, title: '自动化工作流', desc: '集成现有生产流程' },
    { icon: <Mic />, title: '离线听书', desc: '有声书音频转播客' },
    { icon: <Mic />, title: '演唱会录音', desc: '演唱会音频分享订阅' },
    { icon: <Mic />, title: 'B站视频音频', desc: 'B站视频提取音频发布' },
    { icon: <Mic />, title: 'YouTube音频', desc: 'YouTube转音频播客' },
  ];

  const techFeatures = [
    { icon: <Speed />, title: '快速部署', desc: 'Docker 一键启动' },
    { icon: <Security />, title: '安全认证', desc: 'Access Key 机制' },
    { icon: <Cloud />, title: '多格式支持', desc: 'MP3/M4A/WAV/FLAC' },
    { icon: <Speed />, title: 'SQLite 数据库', desc: '轻量级无需配置' },
    { icon: <Security />, title: '多用户支持', desc: '独立播客库管理' },
    { icon: <Cloud />, title: '自动元数据', desc: '提取音频信息' },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F8FAFC' }}>
      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
          color: 'white',
          pt: { xs: 8, md: 12 },
          pb: { xs: 8, md: 12 },
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
            pointerEvents: 'none',
          },
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Chip
              label="开源播客托管解决方案"
              sx={{
                mb: 3,
                bgcolor: 'rgba(255,255,255,0.2)',
                color: 'white',
                fontWeight: 600,
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            />
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2.5rem', md: '4rem' },
                fontWeight: 700,
                mb: 2,
                letterSpacing: '-0.02em',
              }}
            >
              Folder2Podcast
            </Typography>
            <Typography
              variant="h5"
              sx={{
                mb: 4,
                opacity: 0.95,
                fontWeight: 400,
                maxWidth: 700,
                mx: 'auto',
                fontSize: { xs: '1.1rem', md: '1.5rem' },
              }}
            >
              将任意音频文件夹快速转换为专业播客
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                component={Link}
                href="/"
                variant="contained"
                size="large"
                startIcon={<Rocket />}
                sx={{
                  bgcolor: '#F97316',
                  color: 'white',
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  borderRadius: 2,
                  boxShadow: '0 8px 24px rgba(249, 115, 22, 0.3)',
                  transition: 'all 0.2s ease-out',
                  '&:hover': {
                    bgcolor: '#EA580C',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 12px 32px rgba(249, 115, 22, 0.4)',
                  },
                }}
              >
                开始使用
              </Button>
              <Button
                component="a"
                href="https://github.com"
                target="_blank"
                variant="outlined"
                size="large"
                startIcon={<GitHub />}
                sx={{
                  borderColor: 'rgba(255,255,255,0.5)',
                  color: 'white',
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  borderRadius: 2,
                  backdropFilter: 'blur(10px)',
                  bgcolor: 'rgba(255,255,255,0.1)',
                  transition: 'all 0.2s ease-out',
                  '&:hover': {
                    borderColor: 'white',
                    bgcolor: 'rgba(255,255,255,0.2)',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                GitHub
              </Button>
            </Box>
            {/* 特点徽章 */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 4, flexWrap: 'wrap' }}>
              {[
                { icon: <Speed />, text: '一键上传创建' },
                { icon: <RssFeed />, text: '支持所有播客客户端' },
                { icon: <GitHub />, text: 'MIT 开源' },
                { icon: <Api />, text: '完整 RESTful 接口' },
              ].map((item, i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    bgcolor: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(10px)',
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  <Box sx={{ color: 'white', display: 'flex', fontSize: 18 }}>
                    {item.icon}
                  </Box>
                  <Typography variant="body2" sx={{ color: 'white', fontSize: '0.875rem' }}>
                    {item.text}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              mb: 2,
              color: '#1E293B',
              fontSize: { xs: '2rem', md: '2.5rem' },
            }}
          >
            核心特性
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: '#64748B',
              fontWeight: 400,
              maxWidth: 600,
              mx: 'auto',
            }}
          >
            强大的功能，简单的操作
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card
                onMouseEnter={() => setHoveredFeature(index)}
                onMouseLeave={() => setHoveredFeature(null)}
                sx={{
                  height: '100%',
                  cursor: 'pointer',
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: hoveredFeature === index ? feature.color : '#E2E8F0',
                  boxShadow: hoveredFeature === index
                    ? `0 8px 24px ${feature.color}30`
                    : '0 2px 8px rgba(0,0,0,0.05)',
                  transition: 'all 0.3s ease-out',
                  transform: hoveredFeature === index ? 'translateY(-8px)' : 'translateY(0)',
                  '&:hover': {
                    bgcolor: 'background.paper',
                  },
                }}
              >
                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                  <Box
                    sx={{
                      color: feature.color,
                      mb: 2,
                      transition: 'transform 0.3s ease-out',
                      transform: hoveredFeature === index ? 'scale(1.1)' : 'scale(1)',
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      mb: 1,
                      color: '#1E293B',
                    }}
                  >
                    {feature.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#64748B',
                      lineHeight: 1.6,
                      mb: 2,
                    }}
                  >
                    {feature.description}
                  </Typography>
                  {/* 功能点列表 */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, justifyContent: 'center' }}>
                    {feature.points?.map((point, i) => (
                      <Chip
                        key={i}
                        label={point}
                        size="small"
                        sx={{
                          bgcolor: `${feature.color}15`,
                          color: feature.color,
                          fontWeight: 500,
                          fontSize: '0.7rem',
                          height: 24,
                        }}
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Demo Section */}
      <Box sx={{ bgcolor: 'white', py: { xs: 4, md: 6 } }}>
        <Container maxWidth="xl">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 700,
                  mb: 3,
                  color: '#1E293B',
                  fontSize: { xs: '1.75rem', md: '2.25rem' },
                }}
              >
                简单三步，创建播客
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {[
                  { step: '1', title: '拖拽文件夹', desc: '直接将音频文件夹拖入浏览器' },
                  { step: '2', title: '自动创建', desc: '系统自动提取元数据并创建播客' },
                  { step: '3', title: '订阅分享', desc: '获取 RSS 链接，添加到任何播客客户端' },
                ].map((item) => (
                  <Box key={item.step} sx={{ display: 'flex', gap: 2 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        bgcolor: '#2563EB',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {item.step}
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {item.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#64748B' }}>
                        {item.desc}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  position: 'relative',
                  borderRadius: 3,
                  overflow: 'hidden',
                  boxShadow: '0 20px 60px rgba(37, 99, 235, 0.2)',
                  border: '2px dashed #2563EB',
                  bgcolor: '#EEF2FF',
                  p: 4,
                  minHeight: 320,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                }}
              >
                {/* 文件夹图标动画 */}
                <Box
                  sx={{
                    position: 'relative',
                    animation: 'float 3s ease-in-out infinite',
                    '@keyframes float': {
                      '0%, 100%': { transform: 'translateY(0px)' },
                      '50%': { transform: 'translateY(-10px)' },
                    },
                  }}
                >
                  <DriveFolderUpload
                    sx={{
                      fontSize: 80,
                      color: '#2563EB',
                      filter: 'drop-shadow(0 4px 12px rgba(37, 99, 235, 0.3))',
                    }}
                  />
                </Box>

                {/* 拖拽提示 */}
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    variant="h6"
                    sx={{
                      color: '#2563EB',
                      fontWeight: 600,
                      mb: 1,
                    }}
                  >
                    拖拽文件夹到这里
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#64748B',
                      mb: 1,
                    }}
                  >
                    支持 MP3、M4A、WAV、FLAC、OGG、AAC 等格式
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap', mt: 1 }}>
                    {['自动提取元数据', '批量上传', '智能命名'].map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(37, 99, 235, 0.1)',
                          color: '#2563EB',
                          fontSize: '0.7rem',
                          height: 22,
                        }}
                      />
                    ))}
                  </Box>
                </Box>

                {/* 流程指示器 */}
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                  >
                    <DriveFolderUpload sx={{ color: '#F97316', fontSize: 24 }} />
                  </Box>
                  <Box sx={{ color: '#CBD5E1' }}>→</Box>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                  >
                    <Mic sx={{ color: '#10B981', fontSize: 24 }} />
                  </Box>
                  <Box sx={{ color: '#CBD5E1' }}>→</Box>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                  >
                    <RssFeed sx={{ color: '#2563EB', fontSize: 24 }} />
                  </Box>
                </Box>

                {/* 装饰性波纹 */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: -20,
                    right: -20,
                    width: 100,
                    height: 100,
                    borderRadius: '50%',
                    bgcolor: '#2563EB',
                    opacity: 0.05,
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: -30,
                    left: -30,
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    bgcolor: '#F97316',
                    opacity: 0.05,
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Tech Features */}
      <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              mb: 2,
              color: '#1E293B',
              fontSize: { xs: '2rem', md: '2.5rem' },
            }}
          >
            技术特性
          </Typography>
        </Box>
        <Grid container spacing={4}>
          {techFeatures.map((feature, index) => (
            <Grid item xs={12} sm={4} key={index}>
              <Box sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: 2,
                    bgcolor: '#EEF2FF',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  {feature.icon}
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  {feature.title}
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748B' }}>
                  {feature.desc}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Use Cases */}
      <Box sx={{ bgcolor: 'white', py: { xs: 4, md: 6 } }}>
        <Container maxWidth="xl">
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                mb: 2,
                color: '#1E293B',
                fontSize: { xs: '2rem', md: '2.5rem' },
              }}
            >
              适用场景
            </Typography>
          </Box>
          <Grid container spacing={3}>
            {useCases.map((useCase, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card
                  sx={{
                    textAlign: 'center',
                    p: 3,
                    borderRadius: 3,
                    border: '1px solid #E2E8F0',
                    transition: 'all 0.2s ease-out',
                    '&:hover': {
                      boxShadow: '0 8px 24px rgba(37, 99, 235, 0.15)',
                      borderColor: '#2563EB',
                      transform: 'translateY(-4px)',
                    },
                  }}
                >
                  <Box sx={{ color: '#2563EB', mb: 2 }}>
                    {useCase.icon}
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    {useCase.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748B' }}>
                    {useCase.desc}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)',
          color: 'white',
          py: { xs: 6, md: 10 },
        }}
      >
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                mb: 2,
                fontSize: { xs: '1.75rem', md: '2.25rem' },
              }}
            >
              开始使用 Folder2Podcast
            </Typography>
            <Typography
              variant="h6"
              sx={{
                mb: 4,
                opacity: 0.9,
                fontWeight: 400,
              }}
            >
              让播客创作更简单
            </Typography>
            <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                component={Link}
                href="/"
                variant="contained"
                size="large"
                startIcon={<Rocket />}
                sx={{
                  bgcolor: '#F97316',
                  color: 'white',
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  borderRadius: 2,
                  boxShadow: '0 8px 24px rgba(249, 115, 22, 0.3)',
                  '&:hover': {
                    bgcolor: '#EA580C',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 12px 32px rgba(249, 115, 22, 0.4)',
                  },
                }}
              >
                立即开始
              </Button>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <CheckCircle sx={{ color: '#10B981' }} />
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  免费开源
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <CheckCircle sx={{ color: '#10B981' }} />
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Docker 一键部署
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <CheckCircle sx={{ color: '#10B981' }} />
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  完整 API 文档
                </Typography>
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          bgcolor: '#0F172A',
          color: '#94A3B8',
          py: 4,
          textAlign: 'center',
        }}
      >
        <Container maxWidth="xl">
          <Typography variant="body2">
            © 2026 Folder2Podcast. MIT License
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
