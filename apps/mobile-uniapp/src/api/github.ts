import { get } from '@/utils/request';

export interface GithubContributionStats {
  currentStreak: number;
  todayContribution: number;
  totalContributions: number;
  contributions: any[];
}

export interface GithubCommitVO {
  id?: string;
  repo?: string;
  repoUrl?: string;
  commitUrl?: string;
  message?: string;
  date?: string;
  avatar?: string;
  actor?: string;
}

export const getRecentCommitsApi = (perPage = 20) => {
  return get<GithubCommitVO[]>('/github/recent-commits', { perPage });
};
