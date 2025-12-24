# sortOrder 排序系统实施指南

## 已完成

✅ 数据库 Schema 添加 `sortOrder` 和 `basePubDate` 字段
✅ 数据库迁移完成
✅ 创建 `sortOrder.ts` 工具函数

## 待完成的修改

### 1. 首次扫描自动生成 sortOrder

**文件**: `src/services/podcast.ts:scanPodcastEpisodes()`

**修改位置**: 插入新剧集时

```typescript
if (!existing) {
  // ✅ 计算 sortOrder
  const existingEpisodes = await db.select()
    .from(episodesTable)
    .where(eq(episodesTable.podcastId, podcastId))
    .all();

  const maxSortOrder = existingEpisodes.length > 0
    ? Math.max(...existingEpisodes.map(ep => ep.sortOrder || 0))
    : 0;

  const sortOrder = maxSortOrder + 1;

  await db.insert(episodesTable).values({
    // ... 其他字段
    sortOrder,  // ⭐ 新增
    version: 1,
  });
}
```

### 2. 在数据生成时应用 pubDate 计算

**文件**: `src/services/feed-data.service.ts:generatePodcastFeedData()`

**修改位置**: 转换为标准化格式之前

```typescript
import { getBasePubDate, generatePubDatesForEpisodes } from '../utils/sortOrder';

export async function generatePodcastFeedData(podcastId: string) {
  // ... 现有代码

  const rawEpisodes = await db.select()...;

  // ⭐ 计算基准日期
  const baseDate = getBasePubDate(podcast, rawEpisodes);

  // ⭐ 为所有剧集生成 pubDate
  const episodesWithPubDate = generatePubDatesForEpisodes(rawEpisodes, baseDate);

  // 转换为标准化格式
  const episodes: FeedEpisode[] = episodesWithPubDate.map((ep) => {
    // ... 现有转换逻辑
  });

  // ⭐ 按 pubDate 降序排列
  episodes.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
}
```

### 3. API 支持编辑 sortOrder

**文件**: `src/routes/episodes.routes.ts`

**新增端点**: `PATCH /api/podcasts/:id/episodes/:fileName`

```typescript
server.patch<{
  Params: { id: string; fileName: string };
  Body: { sortOrder?: number; title?: string; description?: string }
}>(
  '/api/podcasts/:id/episodes/:fileName',
  { preHandler: requireAuth },
  async (request, reply) => {
    const { sortOrder, ...otherMetadata } = request.body;

    // 更新 sortOrder
    if (sortOrder !== undefined) {
      await db.update(episodesTable)
        .set({
          sortOrder,
          updatedAt: new Date(),
        })
        .where(eq(episodesTable.id, episodeId));
    }

    // 更新其他元数据
    if (Object.keys(otherMetadata).length > 0) {
      await updateEpisodeMetadata(id, fileName, userId, otherMetadata);
    }

    return { success: true };
  }
);
```

### 4. 前端显示 sortOrder

**文件**: `web/src/components/FileManager.jsx`

**修改**: 添加序号列

```jsx
<div class="file-table-header">
  <div class="file-table-cell" style={{ flex: '0 0 60px' }}>序号</div>  {/* ⭐ 新增 */}
  <div class="file-table-cell" style={{ flex: '0 0 50px' }}>类型</div>
  {/* ... 其他列 */}
</div>

<For each={audioFiles()}>
  {(fileName) => {
    const episode = episodes()?.data?.find(ep => ep.fileName === fileName);

    return (
      <div class="file-table-row">
        <div class="file-table-cell" style={{ flex: '0 0 60px', 'text-align': 'center' }}>
          {episode?.sortOrder || '-'}
        </div>
        {/* ... 其他单元格 */}
      </div>
    );
  }}
</For>
```

### 5. 编辑器添加 sortOrder 输入

**文件**: `web/src/components/EpisodeEditorModal.jsx`

**新增字段**:

```jsx
const [sortOrder, setSortOrder] = createSignal(0);

// 当剧集数据变化时更新
createEffect(() => {
  if (props.episode) {
    setSortOrder(props.episode.sortOrder || 0);
  }
});

// 保存时包含 sortOrder
const handleSave = async () => {
  const metadata = {
    sortOrder: sortOrder() || null,
    title: title(),
    description: description(),
  };

  await episodesAPI.updateMetadata(
    props.podcastDir,
    props.episode.fileName,
    metadata
  );
};

// UI 添加输入框
<div class="form-group">
  <label>排序序号</label>
  <input
    type="number"
    min="1"
    value={sortOrder()}
    onInput={(e) => setSortOrder(parseInt(e.target.value) || 0)}
  />
  <p class="hint">
    序号越小越新。序号 1 排在最前面,序号越大越靠后。
    修改后发布时间会自动重新生成。
  </p>
</div>
```

### 6. 添加"重新生成时间"功能

**后端 API**: `POST /api/podcasts/:id/episodes/regenerate-dates`

```typescript
server.post<{ Params: { id: string } }>(
  '/api/podcasts/:id/episodes/regenerate-dates',
  { preHandler: requireAuth },
  async (request, reply) => {
    const episodes = await db.select()
      .from(episodesTable)
      .where(eq(episodesTable.podcastId, podcastId))
      .all();

    const baseDate = getBasePubDate(podcast, episodes);

    for (const ep of episodes) {
      if (ep.sortOrder) {
        const newPubDate = generatePubDateFromSortOrder(ep.sortOrder, baseDate);
        await db.update(episodesTable)
          .set({ pubDate: newPubDate, updatedAt: new Date() })
          .where(eq(episodesTable.id, ep.id));
      }
    }

    return { success: true, count: episodes.length };
  }
);
```

**前端按钮**: 在播客管理页面添加

```jsx
<button onClick={handleRegenerateDates}>
  🔄 重新生成所有发布时间
</button>

const handleRegenerateDates = async () => {
  await podcastsAPI.regenerateDates(podcast.id);
  toast.success('已重新生成所有发布时间');
  refetchEpisodes();
};
```

## 数据库迁移

已执行:
```sql
ALTER TABLE episodes ADD COLUMN sort_order INTEGER;
ALTER TABLE podcasts ADD COLUMN base_pub_date INTEGER;
```

为现有剧集生成 sortOrder:
```sql
-- 方法 1: 按文件名排序生成序号
-- 需要在代码中实现

-- 方法 2: 手动在编辑器中设置
```

## TypeScript 类型更新

**`src/services/feed-data.service.ts`**:

```typescript
export interface FeedEpisode {
  // ... 现有字段
  sortOrder: number | null;  // ⭐ 新增
}

export interface FeedPodcast {
  // ... 现有字段
  basePubDate: Date | null;  // ⭐ 新增
}
```

## 测试清单

- [ ] 首次扫描自动生成 sortOrder (1, 2, 3...)
- [ ] 编辑 sortOrder 后 pubDate 自动更新
- [ ] RSS Feed 按 pubDate 降序排列
- [ ] sortOrder=1 的剧集排在最前面
- [ ] "重新生成时间"功能正常工作
- [ ] 保留"重新发布"功能(version++)

## 下一步

继续完成上述待办事项,或者你想先测试当前的基础功能?
