/**
 * 通用响应格式 Schemas
 * 基于 JSend 规范
 */

import { z } from 'zod';

/**
 * JSend Success 响应
 */
export const SuccessResponse = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    status: z.literal('success').describe('响应状态'),
    data: dataSchema.describe('响应数据'),
  });

/**
 * JSend Fail 响应（客户端错误）
 */
export const FailResponse = z.object({
  status: z.literal('fail').describe('响应状态'),
  data: z.record(z.string(), z.string()).describe('验证错误详情'),
});

/**
 * JSend Error 响应（服务器错误）
 */
export const ErrorResponse = z.object({
  status: z.literal('error').describe('响应状态'),
  message: z.string().describe('错误消息'),
  code: z.number().optional().describe('错误代码'),
  data: z.any().optional().describe('附加错误数据'),
});

/**
 * 分页响应元数据
 */
export const PaginationMeta = z.object({
  total: z.number().int().min(0).describe('总记录数'),
  page: z.number().int().min(1).describe('当前页码'),
  pageSize: z.number().int().min(1).max(100).describe('每页记录数'),
  totalPages: z.number().int().min(0).describe('总页数'),
});

/**
 * 分页响应
 */
export const PaginatedResponse = <T extends z.ZodType>(itemSchema: T) =>
  SuccessResponse(
    z.object({
      items: z.array(itemSchema).describe('数据列表'),
      meta: PaginationMeta.describe('分页信息'),
    })
  );
