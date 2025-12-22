/**
 * Fastify 类型扩展
 *
 * 为 Fastify 添加自定义类型定义，主要是为 Session 添加 user 属性
 */

import 'fastify';
import '@fastify/session';

declare module 'fastify' {
  interface FastifyRequest {
    session: FastifySessionObject;
  }
}

declare module '@fastify/session' {
  interface FastifySessionObject {
    user?: {
      id: string;
      username: string;
      nickname?: string | null;
    };
  }
}
