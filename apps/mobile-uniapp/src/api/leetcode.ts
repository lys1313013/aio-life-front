import { get } from '@/utils/request';

export interface LeetcodeStats {
  solved: number;
  easy: number;
  medium: number;
  hard: number;
}

export async function getLeetcodeStatsApi(username: string): Promise<LeetcodeStats> {
  return get<LeetcodeStats>(`/leetcode/stats`, { username });
}
