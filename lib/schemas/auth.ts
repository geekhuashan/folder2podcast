/**
 * 认证相关 Schemas
 */

import { z } from 'zod';

/**
 * 登录请求
 */
export const LoginRequest = z.object({
  username: z.string().min(1).max(50).describe('用户名'),
  password: z.string().min(1).max(100).describe('密码'),
});

/**
 * 登录响应数据
 */
export const LoginResponseData = z.object({
  userId: z.string().describe('用户ID'),
  username: z.string().describe('用户名'),
  accessKey: z.string().describe('访问密钥'),
});

/**
 * 注册请求
 */
export const RegisterRequest = z.object({
  username: z
    .string()
    .min(1, '用户名不能为空')
    .max(50, '用户名最多50个字符')
    .regex(/^[a-zA-Z0-9_-]+$/, '用户名只能包含字母、数字、下划线和连字符')
    .describe('用户名'),
  password: z
    .string()
    .min(1, '密码不能为空')
    .max(100, '密码最多100个字符')
    .describe('密码'),
});

/**
 * 注册响应数据
 */
export const RegisterResponseData = z.object({
  userId: z.string().describe('用户ID'),
  username: z.string().describe('用户名'),
  accessKey: z.string().describe('访问密钥'),
  createdAt: z.string().datetime().describe('创建时间'),
});
