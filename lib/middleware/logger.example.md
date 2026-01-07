# API 日志工具使用指南

## 概述

`lib/middleware/logger.ts` 提供了统一的 API 日志记录工具，可以自动记录所有请求和响应的日志，并根据 HTTP 状态码使用不同的颜色和日志级别。

## 快速开始

### 1. 导入日志工具

```typescript
import { createApiLogger } from '@/lib/middleware/logger';
```

### 2. 在 API 路由中使用

```typescript
export async function POST(request: NextRequest) {
  // 创建日志记录器（会自动记录请求开始）
  const logger = createApiLogger(request);

  // 验证失败 - 使用 logWarning
  const auth = await authenticateRequest(request);
  if (!auth) {
    logger.logWarning(401, 'Invalid or missing access key');
    return jsonResponse(error('Unauthorized', 401), 401);
  }

  try {
    // 验证失败 - 使用 logWarning
    if (!isValid) {
      logger.logWarning(400, 'Validation failed', validationErrors);
      return jsonResponse(fail(validationErrors), 400);
    }

    // 资源冲突 - 使用 logWarning
    if (exists) {
      logger.logWarning(409, 'Resource already exists');
      return jsonResponse(fail({ error: 'Already exists' }), 409);
    }

    // ... 业务逻辑 ...

    // 成功 - 使用 logSuccess
    logger.logSuccess(201, 'Resource created successfully');
    return jsonResponse(success(data), 201);

  } catch (err) {
    // 服务器错误 - 使用 logError
    logger.logError(500, 'Internal server error', err);
    return jsonResponse(error('Server error', 500), 500);
  }
}
```

## API 方法

### `createApiLogger(request: NextRequest): ApiLogger`

创建一个日志记录器实例，并自动记录请求开始。

**参数：**
- `request`: Next.js 请求对象

**返回：**
- `ApiLogger` 实例

### `logger.logSuccess(status, message?, data?)`

记录成功响应（200-299），使用绿色输出。

**参数：**
- `status`: HTTP 状态码（如 200, 201）
- `message`: 可选的描述信息
- `data`: 可选的数据对象

### `logger.logWarning(status, message?, data?)`

记录警告响应（400-499），使用黄色输出。

**参数：**
- `status`: HTTP 状态码（如 400, 401, 404, 409）
- `message`: 可选的描述信息
- `data`: 可选的错误详情对象

### `logger.logError(status, message?, error?)`

记录错误响应（500+），使用红色输出。

**参数：**
- `status`: HTTP 状态码（如 500, 503）
- `message`: 可选的描述信息
- `error`: 可选的错误对象

### `logger.log(status, message?, data?)`

自动根据状态码选择合适的日志方法。

**参数：**
- `status`: HTTP 状态码
- `message`: 可选的描述信息
- `data`: 可选的数据对象

## 日志输出示例

### 请求开始
```
[API] POST /api/v1/podcasts - Request received
```

### 成功响应（绿色）
```
[API] POST /api/v1/podcasts - 201 CREATED - Podcast created: my-podcast (abc123) (45ms)
```

### 警告响应（黄色）
```
[API] POST /api/v1/podcasts - 409 CONFLICT - Directory name already exists: my-podcast (12ms)
```

### 错误响应（红色）
```
[API] POST /api/v1/podcasts - 500 INTERNAL_SERVER_ERROR - Failed to create podcast (230ms)
```

## 完整示例

参考 `app/api/v1/podcasts/route.ts` 查看完整的使用示例。

## 最佳实践

1. **总是在函数开始创建 logger**
   ```typescript
   const logger = createApiLogger(request);
   ```

2. **在返回响应前记录日志**
   ```typescript
   logger.logWarning(409, 'Resource exists');
   return jsonResponse(...);
   ```

3. **为日志添加有意义的描述**
   ```typescript
   // 好
   logger.logSuccess(200, `Found ${podcasts.length} podcasts`);

   // 不好
   logger.logSuccess(200);
   ```

4. **在 catch 块中记录完整的错误对象**
   ```typescript
   catch (err) {
     logger.logError(500, 'Database error', err);
     return jsonResponse(error('Server error', 500), 500);
   }
   ```

## 状态码对照表

| 状态码 | 文本 | 日志方法 | 颜色 | 用途 |
|--------|------|----------|------|------|
| 200 | OK | logSuccess | 绿色 | 成功获取资源 |
| 201 | CREATED | logSuccess | 绿色 | 成功创建资源 |
| 204 | NO_CONTENT | logSuccess | 绿色 | 成功删除资源 |
| 400 | BAD_REQUEST | logWarning | 黄色 | 请求参数错误 |
| 401 | UNAUTHORIZED | logWarning | 黄色 | 未授权 |
| 403 | FORBIDDEN | logWarning | 黄色 | 禁止访问 |
| 404 | NOT_FOUND | logWarning | 黄色 | 资源不存在 |
| 409 | CONFLICT | logWarning | 黄色 | 资源冲突 |
| 500 | INTERNAL_SERVER_ERROR | logError | 红色 | 服务器错误 |

## 扩展其他 API 路由

要为其他 API 路由添加日志，只需按照上述模式修改即可。建议优先处理以下路由：

1. `app/api/v1/auth/login/route.ts`
2. `app/api/v1/upload/route.ts`
3. `app/api/v1/podcasts/[username]/[dirName]/route.ts`
4. `app/api/v1/podcasts/[username]/[dirName]/episodes/route.ts`
