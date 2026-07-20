/**
 * Hook for the paginated, searchable, filterable learning-path list (Home card grid).
 * Infinite scroll: uses useInfiniteQuery — appends pages as the user scrolls.
 * search/sort/levelFilter run server-side; changing any resets to page 1 (query key).
 * Keeps `useLearningPaths` (all paths) separate for the knowledge-map canvas.
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { graphQueryApi } from '../api/queryApi';
import { knowledgeGraphKeys } from './queryKeys';
import type {
  LearningPathSortOption,
  LearningPathLevelFilter,
  LearningPathsListResponse,
} from '../api/types';

export interface UseLearningPathsListParams {
  search: string;
  sort: LearningPathSortOption;
  levelFilter: LearningPathLevelFilter;
  limit: number;
}

export function useLearningPathsList(params: UseLearningPathsListParams) {
  const query = useInfiniteQuery({
    queryKey: knowledgeGraphKeys.learningPathsList({
      search: params.search,
      sort: params.sort,
      levelFilter: params.levelFilter,
      page: 0, // page param is irrelevant for the key; params object identity is what matters
      limit: params.limit,
    }),
    queryFn: ({ pageParam }) =>
      graphQueryApi.getLearningPathsList({
        search: params.search,
        sort: params.sort,
        levelFilter: params.levelFilter,
        page: pageParam,
        limit: params.limit,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    staleTime: 60 * 1000,
  });

  const pages = query.data?.pages ?? [];
  const items = pages.flatMap((p) => p.items);
  const last = pages[pages.length - 1];

  return {
    items,
    total: last?.total ?? 0,
    totalPages: last?.totalPages ?? 1,
    // `isLoading` (RQ: isPending && isFetching) is true only on the first fetch with
    // no cached data — use it (not total) to gate the skeleton vs. empty state.
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    error: query.error?.message ?? null,
  };
}
