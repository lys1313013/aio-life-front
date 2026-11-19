import { requestClient } from '#/api/request';

import { getQuery } from '#/api/query';

export interface RankingOption {
  id: string;
  name: string;
}

export function fetchRankings(media: 'book' | 'movie') {
  return getQuery<RankingOption[]>('/creative-works/rankings', { media });
}

export async function retryWorkCover(workId: string) {
  await requestClient.post(`/creative-works/${workId}/cover/retry`);
  return `/creative-works/${workId}/cover`;
}
