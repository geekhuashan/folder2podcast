/**
 * SWR Hooks for API data fetching
 */

'use client';

import useSWR, { mutate } from 'swr';
import type { Podcast, Episode, EpisodesResponse } from '@/lib/types';
import { podcastsAPI } from '@/lib/api/client';

// 播客列表 Hook
export function usePodcasts() {
  const { data, error, isLoading } = useSWR(
    typeof window !== 'undefined' && localStorage.getItem('accessKey') ? 'podcasts' : null,
    async () => {
      const response = await podcastsAPI.list();
      if (response.status === 'success') {
        return response.data;
      }
      throw new Error(response.status === 'error' ? response.message : 'Failed to fetch podcasts');
    }
  );

  return {
    podcasts: data,
    isLoading,
    error,
    mutate: () => mutate('podcasts'),
  };
}

// 单个播客 Hook
export function usePodcast(userId: string | null, dirName: string | null) {
  const { data, error, isLoading } = useSWR(
    userId && dirName ? `podcast-${userId}-${dirName}` : null,
    async () => {
      if (!userId || !dirName) return null;
      const response = await podcastsAPI.get(userId, dirName);
      if (response.status === 'success') {
        return response.data;
      }
      throw new Error(response.status === 'error' ? response.message : 'Failed to fetch podcast');
    }
  );

  return {
    podcast: data,
    isLoading,
    error,
    mutate: () => mutate(`podcast-${userId}-${dirName}`),
  };
}

// 剧集列表 Hook
export function useEpisodes(userId: string | null, dirName: string | null) {
  const { data, error, isLoading } = useSWR(
    userId && dirName ? `episodes-${userId}-${dirName}` : null,
    async () => {
      if (!userId || !dirName) return null;
      const response = await podcastsAPI.getEpisodes(userId, dirName);
      if (response.status === 'success') {
        return response.data;
      }
      throw new Error(response.status === 'error' ? response.message : 'Failed to fetch episodes');
    }
  );

  return {
    episodes: data?.episodes,
    total: data?.total,
    isLoading,
    error,
    mutate: () => mutate(`episodes-${userId}-${dirName}`),
  };
}
