import { get } from '@/utils/request';

export interface CsdnStats {
  viewCount: number;
  originalCount: number;
  rank: number;
  fansCount: number;
  likeCount: number;
  commentCount?: number;
}

export interface CsdnArticle {
  id: string;
  title: string;
  url: string;
  description: string;
  postTime: string;
  viewCount: number;
  commentCount: number;
  likeCount?: number;
  collectCount?: number;
}

export async function getCsdnStatsApi(username: string): Promise<CsdnStats> {
  return get<CsdnStats>(`/csdn/stats`, { username });
}

export async function getCsdnArticlesApi(
  username: string,
  limit: number = 20,
): Promise<CsdnArticle[]> {
  return get<CsdnArticle[]>(`/csdn/articles`, { username, limit });
}
