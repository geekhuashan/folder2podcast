import { PodcastConfig, PodcastConfigV2 } from '../types';

/**
 * 将 V1 配置格式迁移到 V2 格式
 * @param v1Config V1 格式的配置对象
 * @returns V2 格式的配置对象
 */
export function migrateV1ToV2(v1Config: PodcastConfig): PodcastConfigV2 {
    const v2Config: PodcastConfigV2 = {
        metadata: {},
        parsing: {}
    };

    // 映射 metadata 字段
    if (v1Config.title !== undefined) v2Config.metadata!.title = v1Config.title;
    if (v1Config.description !== undefined) v2Config.metadata!.description = v1Config.description;
    if (v1Config.author !== undefined) v2Config.metadata!.author = v1Config.author;
    if (v1Config.language !== undefined) v2Config.metadata!.language = v1Config.language;
    if (v1Config.category !== undefined) v2Config.metadata!.category = v1Config.category;
    if (v1Config.explicit !== undefined) v2Config.metadata!.explicit = v1Config.explicit;
    if (v1Config.email !== undefined) v2Config.metadata!.email = v1Config.email;
    if (v1Config.websiteUrl !== undefined) v2Config.metadata!.websiteUrl = v1Config.websiteUrl;

    // 映射 parsing 字段
    if (v1Config.episodeNumberStrategy !== undefined) v2Config.parsing!.episodeNumberStrategy = v1Config.episodeNumberStrategy;
    if (v1Config.useMTime !== undefined) v2Config.parsing!.useMTime = v1Config.useMTime;

    return v2Config;
}
