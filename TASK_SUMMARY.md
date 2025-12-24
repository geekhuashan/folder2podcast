# 任务总结 - sortOrder 排序系统重构

## 📋 任务目标

实现基于 `sortOrder` 的排序系统,用户通过调整序号控制剧集在 RSS Feed 中的顺序。

### 核心需求
1. **sortOrder 小 = 最新**: sortOrder=1 的剧集排在最前面
2. **sortOrder 必填**: 首次扫描自动生成 1,2,3...
3. **pubDate 自动生成**: 根据 sortOrder 和基准时间自动计算
4. **保留重新发布**: version++ 功能继续保留

### 排序算法
```
baseDate = 用户配置 || sortOrder最小剧集的创建时间 || 当前时间
pubDate = baseDate + (sortOrder - 1) * 24小时

示例:
  sortOrder=1, baseDate=2024-12-01 → pubDate=2024-12-01 (最新)
  sortOrder=2, baseDate=2024-12-01 → pubDate=2024-12-02
  sortOrder=10, baseDate=2024-12-01 → pubDate=2024-12-10 (最旧)

RSS Feed 排序: 按 pubDate 降序 (newest first)
  → 2024-12-10, 2024-12-09, ..., 2024-12-01
```

---

## ✅ 已完成

### 1. 数据库 Schema 变更
**文件**: `src/db/schema.ts`

- ✅ `episodes` 表添加 `sortOrder: integer`
- ✅ `podcasts` 表添加 `basePubDate: timestamp` (可选)
- ✅ 数据库迁移执行:
  ```sql
  ALTER TABLE episodes ADD COLUMN sort_order INTEGER;
  ALTER TABLE podcasts ADD COLUMN base_pub_date INTEGER;
  ```

### 2. 工具函数
**文件**: `src/utils/sortOrder.ts` (已创建)

```typescript
// 根据 sortOrder 生成 pubDate
generatePubDateFromSortOrder(sortOrder, baseDate): Date

// 获取基准日期(优先级: 用户配置 > sortOrder最小剧集 > 当前时间)
getBasePubDate(podcast, episodes): Date

// 批量为剧集生成 pubDate
generatePubDatesForEpisodes(episodes, baseDate): Episode[]
```

### 3. 实施指南
**文件**: `SORTORDER_IMPLEMENTATION.md` (已创建)

包含完整的代码修改清单和示例。

---

## 🔄 进行中

### 1. 首次扫描自动生成 sortOrder
**文件**: `src/services/podcast.ts`
**状态**: 需要修改
**位置**: `scanPodcastEpisodes()` 函数,插入新剧集时

**修改内容**:
```typescript
// 计算 maxSortOrder
const maxSortOrder = existingEpisodes.length > 0
  ? Math.max(...existingEpisodes.map(ep => ep.sortOrder || 0))
  : 0;

await db.insert(episodesTable).values({
  sortOrder: maxSortOrder + 1,  // ⭐ 新增
  // ... 其他字段
});
```

### 2. 应用 pubDate 自动生成
**文件**: `src/services/feed-data.service.ts`
**状态**: 需要修改
**位置**: `generatePodcastFeedData()` 函数

**修改内容**:
```typescript
import { getBasePubDate, generatePubDatesForEpisodes } from '../utils/sortOrder';

// 计算基准日期
const baseDate = getBasePubDate(podcast, rawEpisodes);

// 为所有剧集生成 pubDate
const episodesWithPubDate = generatePubDatesForEpisodes(rawEpisodes, baseDate);

// 转换 + 排序
const episodes = episodesWithPubDate.map(ep => ({ ...ep }));
episodes.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
```

### 3. API 支持编辑 sortOrder
**文件**: `src/routes/episodes.routes.ts`
**状态**: 需要新增端点或修改现有 PATCH 端点

**新增内容**:
```typescript
// PATCH 端点接受 sortOrder 参数
{ sortOrder, title, description, ... } = request.body

if (sortOrder !== undefined) {
  await db.update(episodesTable).set({ sortOrder });
}
```

### 4. 前端显示 sortOrder
**文件**: `web/src/components/FileManager.jsx`
**状态**: 需要添加列

**修改**: 添加"序号"列,显示 `episode.sortOrder`

### 5. 编辑器输入 sortOrder
**文件**: `web/src/components/EpisodeEditorModal.jsx`
**状态**: 需要添加表单字段

**新增**:
```jsx
<input type="number" value={sortOrder()} onChange={setSortOrder} />
<p class="hint">序号越小越新,序号1排在最前面</p>
```

### 6. "重新生成时间"功能
**后端**: 新增 API `POST /api/podcasts/:id/episodes/regenerate-dates`
**前端**: 添加按钮调用 API

---

## 📝 待办事项清单

- [ ] 修改扫描逻辑生成 sortOrder
- [ ] 修改数据生成逻辑应用 pubDate 计算
- [ ] 更新 PATCH API 支持 sortOrder
- [ ] 前端列表显示 sortOrder
- [ ] 编辑器添加 sortOrder 输入
- [ ] 实现"重新生成时间"API
- [ ] 前端添加"重新生成时间"按钮
- [ ] TypeScript 类型更新 (FeedEpisode, FeedPodcast)

---

## 🐛 已知问题

1. **前端报错**: "Request failed" - 可能是因为 schema 变更导致的类型不匹配
2. **现有数据**: 数据库中已有剧集没有 sortOrder,需要手动设置或批量生成

---

## 🎯 下一步

优先完成核心功能,按以下顺序:
1. 修改扫描逻辑 (新剧集自动有 sortOrder)
2. 修改数据生成逻辑 (pubDate 自动计算)
3. 更新 TypeScript 类型 (避免类型错误)
4. 前端显示和编辑 (用户可见可用)
5. 批量操作功能 (锦上添花)

预计剩余工作量: 6-8 个代码文件修改
