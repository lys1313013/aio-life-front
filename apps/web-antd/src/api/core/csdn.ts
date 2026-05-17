import { requestClient } from '#/api/request';

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

/**
 * 获取 CSDN 用户数据统计
 * @param username CSDN 用户名
 */
export async function getCsdnStatsApi(username: string): Promise<CsdnStats> {
  return requestClient.get<CsdnStats>(`/csdn/stats`, { params: { username } });
}

/**
 * 获取 CSDN 用户最近文章列表
 * @param username CSDN 用户名
 * @param limit 获取条数
 */
export async function getCsdnArticlesApi(
  username: string,
  limit: number = 20,
): Promise<CsdnArticle[]> {
  return requestClient.get<CsdnArticle[]>(`/csdn/articles`, {
    params: { username, limit },
  });
}
