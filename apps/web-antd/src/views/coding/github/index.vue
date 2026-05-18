<script lang="ts" setup>
import { computed, nextTick, ref, watch } from 'vue';

import { useUserStore } from '@vben/stores';

import {
  BarChartOutlined,
  BranchesOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  FireOutlined,
  StarOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons-vue';
import { Card, List, message, Spin, Table, Tag } from 'ant-design-vue';
import dayjs from 'dayjs';

import { getGithubContributionStats } from '#/api/core/github';
import { getUserBindListApi } from '#/api/core/user-bind';

import CodingDashboardLayout from '../components/CodingDashboardLayout.vue';
import ContributionGraph from '../components/ContributionGraph.vue';
import DataListCard from '../components/DataListCard.vue';
import StatCard from '../components/StatCard.vue';

defineOptions({ name: 'GithubGraph' });

const userStore = useUserStore();
const username = ref('');
const githubToken = ref('');
const loading = ref(false);
const error = ref(false);
const errorMessage = ref('');
const contributionData = ref<any>(null);
const graphData = ref<any[]>([]);
const scrollContainer = ref<HTMLDivElement | null>(null);

// Stats
const totalContributions = ref(0);
const maxContribution = ref(0);
const bestMonth = ref({ date: '', count: 0 });
const dailyAverage = ref('0');
const busiestDay = ref({ date: '', count: 0 });
const longestStreak = ref({ days: 0, start: '', end: '' });
const currentStreak = ref(0);
const todayContribution = ref(0);

// Total Stars
const totalStars = computed(() => {
  return repoList.value.reduce(
    (acc, repo) => acc + (repo.stargazers_count || 0),
    0,
  );
});

// Repository Stats
const repoList = ref<any[]>([]);
const reposLoading = ref(false);

// Recent Activity
const recentActivities = ref<any[]>([]);
const activitiesLoading = ref(false);

function formatDate(date: string) {
  if (!date) return '-';
  return dayjs(date).format('YYYY-MM-DD HH:mm');
}

const columns = [
  {
    title: '仓库名',
    dataIndex: 'name',
    key: 'name',
    width: 200,
  },
  {
    title: '语言',
    dataIndex: 'language',
    key: 'language',
    width: 100,
  },
  {
    title: 'Stars',
    dataIndex: 'stargazers_count',
    key: 'stargazers_count',
    width: 80,
  },
  {
    title: 'Forks',
    dataIndex: 'forks_count',
    key: 'forks_count',
    width: 80,
  },
  {
    title: '个人提交数',
    dataIndex: 'myCommits',
    key: 'myCommits',
    width: 110,
  },
  {
    title: '最近提交',
    dataIndex: 'pushed_at',
    key: 'pushed_at',
    width: 160,
  },
];

async function fetchRepoStats(user: string, repos: any[]) {
  // Limit to top 20 to avoid immediate rate limit for heavy users
  const targetRepos = repos.slice(0, 30);

  for (const repo of targetRepos) {
    try {
      const headers: HeadersInit = {};
      if (githubToken.value) {
        headers.Authorization = `Bearer ${githubToken.value}`;
      }

      const res = await fetch(
        `https://api.github.com/repos/${repo.full_name}/contributors?per_page=100`,
        {
          headers,
        },
      );
      if (res.status === 403) {
        repo.myCommits = 'Rate Limit';
        repo.loadingStats = false;
        // Stop fetching if rate limit hit
        break;
      }
      if (res.ok) {
        const contributors = await res.json();
        const contributor = contributors.find(
          (c: any) => c.login.toLowerCase() === user.toLowerCase(),
        );
        repo.myCommits = contributor ? contributor.contributions : 0;
      } else {
        repo.myCommits = 'Error';
      }

      // Fetch source repo info if it is a fork
      if (repo.fork) {
        const repoRes = await fetch(
          `https://api.github.com/repos/${repo.full_name}`,
          {
            headers,
          },
        );
        if (repoRes.status === 403) {
          break;
        }
        if (repoRes.ok) {
          const repoData = await repoRes.json();
          if (repoData.parent) {
            repo.sourceStars = repoData.parent.stargazers_count;
          }
        }
      }
    } catch {
      repo.myCommits = 'Error';
    } finally {
      repo.loadingStats = false;
    }
  }

  // Mark remaining as skipped
  repos.forEach((repo) => {
    if (repo.loadingStats) {
      repo.myCommits = repo.myCommits === 'Loading...' ? '-' : repo.myCommits;
      repo.loadingStats = false;
    }
  });
}

async function fetchRecentActivity(user: string) {
  activitiesLoading.value = true;
  recentActivities.value = [];
  try {
    const headers: HeadersInit = {
      Accept: 'application/vnd.github.v3+json',
    };
    if (githubToken.value) {
      headers.Authorization = `Bearer ${githubToken.value}`;
    }

    const res = await fetch(
      `https://api.github.com/search/commits?q=author:${user}&sort=committer-date&order=desc&per_page=20`,
      {
        headers,
      },
    );
    if (!res.ok) throw new Error('Failed to fetch commits');
    const data = await res.json();

    const commits = data.items.map((item: any) => {
      const repoName = item.repository.name;
      return {
        id: item.sha,
        repo: repoName,
        repoUrl: item.repository.html_url,
        commitUrl: item.html_url,
        message: item.commit.message,
        date: item.commit.author.date,
        avatar: item.author?.avatar_url,
        actor: item.author?.login || user,
      };
    });

    recentActivities.value = commits;
  } catch (error_) {
    console.error(error_);
  } finally {
    activitiesLoading.value = false;
  }
}

async function fetchRepositories(user: string) {
  reposLoading.value = true;
  repoList.value = [];
  try {
    const headers: HeadersInit = {};
    if (githubToken.value) {
      headers.Authorization = `Bearer ${githubToken.value}`;
    }

    const res = await fetch(
      `https://api.github.com/users/${user}/repos?sort=pushed&per_page=100`,
      {
        headers,
      },
    );
    if (!res.ok) throw new Error('Failed to fetch repos');
    const data = await res.json();
    repoList.value = data.map((repo: any) => ({
      ...repo,
      myCommits: 'Loading...',
      loadingStats: true,
    }));
    // Fetch stats in background
    fetchRepoStats(user, repoList.value);
  } catch (error_) {
    console.error(error_);
    message.error('获取仓库列表失败');
  } finally {
    reposLoading.value = false;
  }
}

async function fetchContributions(user: string) {
  try {
    loading.value = true;
    error.value = false;

    const stats = await getGithubContributionStats(
      user,
      githubToken.value || '',
    );
    contributionData.value = { contributions: stats.contributions };
    // currentStreak and todayContribution will be updated in updateChart
    // but we can also use the values from stats directly if we want
  } catch (error_: any) {
    error.value = true;
    contributionData.value = null;
    console.error(error_);
    errorMessage.value = error_.message || '无法加载数据，请检查网络连接。';
    // message.warning(errorMessage.value); // Alert 已经显示了，这里就不弹窗了，或者保留弹窗也可以
  } finally {
    loading.value = false;
  }
}

function updateChart() {
  const data = contributionData.value;
  if (!data || !data.contributions) return;

  const contributions = data.contributions as Array<{
    count: number;
    date: string;
    level: number;
  }>;

  const today = dayjs().format('YYYY-MM-DD');
  const filtered = contributions.filter((item) => item.date <= today);
  filtered.sort((a, b) => a.date.localeCompare(b.date));

  // Today's contribution
  const todayItem = filtered.find((item) => item.date === today);
  todayContribution.value = todayItem ? todayItem.count : 0;

  const windowed = filtered.slice(-371);
  if (windowed.length === 0) return;

  graphData.value = windowed;

  const total = windowed.reduce((acc, item) => acc + item.count, 0);
  totalContributions.value = total;
  maxContribution.value = Math.max(...windowed.map((item) => item.count));

  // 2. Daily Average
  dailyAverage.value = (total / windowed.length).toFixed(1);

  // 3. Best Month
  const monthMap = new Map<string, number>();
  windowed.forEach((item) => {
    const month = item.date.slice(0, 7); // YYYY-MM
    monthMap.set(month, (monthMap.get(month) || 0) + item.count);
  });
  let maxMonthCount = 0;
  let maxMonthDate = '';
  for (const [month, count] of monthMap.entries()) {
    if (count > maxMonthCount) {
      maxMonthCount = count;
      maxMonthDate = month;
    }
  }
  bestMonth.value = {
    date: dayjs(maxMonthDate).format('YYYY年M月'),
    count: maxMonthCount,
  };

  // 4. Busiest Day
  const busiest = windowed.find((item) => item.count === maxContribution.value);
  if (busiest) {
    busiestDay.value = {
      date: dayjs(busiest.date).format('M月D日'),
      count: busiest.count,
    };
  }

  // 5. Longest Streak
  let maxStreak = 0;
  let tempStreak = 0;
  let maxStreakStart = '';
  let maxStreakEnd = '';
  let tempStreakStart = '';

  windowed.forEach((item) => {
    // Streak Logic
    if (item.count > 0) {
      if (tempStreak === 0) {
        tempStreakStart = item.date;
      }
      tempStreak++;
      if (tempStreak > maxStreak) {
        maxStreak = tempStreak;
        maxStreakStart = tempStreakStart;
        maxStreakEnd = item.date;
      }
    } else {
      tempStreak = 0;
    }
  });

  longestStreak.value = {
    days: maxStreak,
    start: maxStreak > 0 ? dayjs(maxStreakStart).format('M月D日') : '-',
    end: maxStreak > 0 ? dayjs(maxStreakEnd).format('M月D日') : '-',
  };

  // 6. Current Streak
  let currentStreakCount = 0;
  for (let i = filtered.length - 1; i >= 0; i--) {
    const item = filtered[i];
    if (!item) continue;
    if (item.count > 0) {
      currentStreakCount++;
    } else {
      // If it's today and count is 0, we check yesterday.
      // If yesterday also 0, streak is 0.
      if (item.date === today && i > 0) {
        continue;
      }
      break;
    }
  }
  currentStreak.value = currentStreakCount;
}

let hasWarnedNoUsername = false;

watch(contributionData, () => {
  updateChart();
});

watch(graphData, () => {
  nextTick(() => {
    if (scrollContainer.value) {
      // Use setTimeout to ensure the DOM is fully updated and rendered
      setTimeout(() => {
        if (scrollContainer.value) {
          scrollContainer.value.scrollLeft = scrollContainer.value.scrollWidth;
        }
      }, 100);
    }
  });
});

watch(
  () => userStore.userInfo,
  async () => {
    try {
      const binds = await getUserBindListApi(true); // 获取Token
      const githubBind = binds.find((item) => item.platform === 'github');
      if (githubBind && githubBind.platformUsername) {
        username.value = githubBind.platformUsername;
        githubToken.value = githubBind.accessToken || '';

        hasWarnedNoUsername = false;
        await Promise.all([
          fetchContributions(username.value),
          fetchRepositories(username.value),
          fetchRecentActivity(username.value),
        ]);
      } else {
        if (!hasWarnedNoUsername) {
          message.warning('未绑定 Github 账号，请在个人中心绑定');
          hasWarnedNoUsername = true;
        }
      }
    } catch (error_) {
      console.error('获取绑定信息失败', error_);
    }
  },
  { immediate: true },
);
</script>

<template>
  <CodingDashboardLayout
    :loading="loading"
    :error="error"
    :error-message="errorMessage"
  >
    <template #skeleton>
      <Card :bordered="false" class="shadow-sm">
        <Skeleton active :paragraph="{ rows: 4 }" />
      </Card>
    </template>

    <div
      class="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-6"
    >
      <StatCard title="最活跃的月份" :value="bestMonth.date" color="blue">
        <template #icon><CalendarOutlined /></template>
      </StatCard>

      <StatCard title="日均提交" :value="dailyAverage" color="green">
        <template #icon><BarChartOutlined /></template>
      </StatCard>

      <StatCard title="总 Star 数" :value="totalStars" color="yellow">
        <template #icon><StarOutlined /></template>
      </StatCard>

      <StatCard
        title="最活跃的一天"
        :value="busiestDay.count"
        unit="次"
        :sub-value="busiestDay.date"
        color="orange"
      >
        <template #icon><ThunderboltOutlined /></template>
      </StatCard>

      <StatCard
        title="最长连续"
        :value="longestStreak.days"
        unit="天"
        :sub-value="`${longestStreak.start}-${longestStreak.end}`"
        color="red"
      >
        <template #icon><FireOutlined /></template>
      </StatCard>

      <StatCard
        title="今日提交次数"
        :value="todayContribution"
        unit="次"
        color="cyan"
      >
        <template #icon><CheckCircleOutlined /></template>
      </StatCard>
    </div>

    <Card
      :bordered="false"
      class="mb-6 shadow-sm"
      :head-style="{
        borderBottom: 'none',
        paddingLeft: '12px',
        paddingRight: '12px',
      }"
      :body-style="{ padding: '0 12px 20px 12px' }"
    >
      <template #title>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="text-sm md:text-base"
            >过去一年共提交 {{ totalContributions }} 次</span
          >
          <span
            class="text-xs font-normal text-gray-500 md:text-sm dark:text-gray-400"
          >
            连续提交:
            <span class="font-medium text-green-600 dark:text-green-500">
              {{ currentStreak }}
            </span>
            天
          </span>
        </div>
      </template>
      <div
        ref="scrollContainer"
        class="w-full overflow-x-auto overflow-y-hidden transition-all"
      >
        <div class="h-[125px] min-w-[720px] md:h-[130px]">
          <ContributionGraph :data="graphData" height="100%" />
        </div>
      </div>
    </Card>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div class="lg:col-span-2">
        <h3 class="mb-4 text-lg font-medium text-gray-800 dark:text-gray-200">
          仓库
        </h3>
        <Table
          :columns="columns"
          :data-source="repoList"
          :loading="reposLoading"
          :pagination="{ pageSize: 10 }"
          :scroll="{ x: 'max-content' }"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'">
              <a
                :href="record.html_url"
                class="flex items-center gap-2 text-blue-500 hover:underline"
                target="_blank"
              >
                <span class="font-medium">{{ record.name }}</span>
                <Tag v-if="record.private" color="red">Private</Tag>
                <Tag v-if="record.fork" color="orange">Fork</Tag>
              </a>
              <div class="max-w-[200px] truncate text-xs text-gray-500">
                {{ record.description }}
              </div>
            </template>
            <template v-if="column.key === 'language'">
              <Tag v-if="record.language" color="blue">
                {{ record.language }}
              </Tag>
            </template>
            <template v-if="column.key === 'stargazers_count'">
              <div class="flex items-center gap-1">
                <StarOutlined class="text-yellow-500" />
                <span>
                  {{ record.stargazers_count }}
                  <span
                    v-if="record.fork && record.sourceStars !== undefined"
                    class="text-xs text-gray-400"
                  >
                    / {{ record.sourceStars }}
                  </span>
                </span>
              </div>
            </template>
            <template v-if="column.key === 'forks_count'">
              <div class="flex items-center gap-1">
                <BranchesOutlined class="text-gray-500" />
                <span>{{ record.forks_count }}</span>
              </div>
            </template>
            <template v-if="column.key === 'pushed_at'">
              <span class="text-gray-500">
                {{ formatDate(record.pushed_at) }}
              </span>
            </template>
            <template v-if="column.key === 'myCommits'">
              <div v-if="record.loadingStats" class="flex items-center gap-2">
                <Spin size="small" />
              </div>
              <span
                v-else
                :class="{
                  'font-bold text-green-600':
                    typeof record.myCommits === 'number' &&
                    record.myCommits > 0,
                }"
              >
                {{ record.myCommits }}
              </span>
            </template>
          </template>
        </Table>
      </div>

      <div class="lg:relative lg:col-span-1">
        <div class="flex flex-col lg:absolute lg:inset-0">
          <DataListCard
            title="最近提交"
            :loading="activitiesLoading"
            :is-empty="recentActivities.length === 0"
            empty-text="暂无最近动态"
          >
            <List item-layout="horizontal" :data-source="recentActivities">
              <template #renderItem="{ item }">
                <List.Item
                  class="!px-4 !py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <div class="w-full">
                    <div class="mb-1 flex items-center justify-between">
                      <a
                        :href="item.repoUrl"
                        target="_blank"
                        class="max-w-[200px] truncate font-medium text-blue-500 hover:underline"
                        :title="item.repo"
                      >
                        {{ item.repo }}
                      </a>
                      <span class="shrink-0 text-xs text-gray-400">{{
                        formatDate(item.date)
                      }}</span>
                    </div>
                    <div
                      class="line-clamp-2 break-all text-xs text-gray-500 dark:text-gray-400"
                      :title="item.message"
                    >
                      <a
                        :href="item.commitUrl"
                        target="_blank"
                        class="text-gray-500 hover:text-blue-500 hover:underline dark:text-gray-400 dark:hover:text-blue-400"
                      >
                        {{ item.message }}
                      </a>
                    </div>
                  </div>
                </List.Item>
              </template>
            </List>
          </DataListCard>
        </div>
      </div>
    </div>
  </CodingDashboardLayout>
</template>

<style scoped>
/* 手机端隐藏滚动条 */
@media (max-width: 768px) {
  .overflow-x-auto {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .overflow-x-auto::-webkit-scrollbar {
    display: none;
  }
}

.overflow-x-auto::-webkit-scrollbar {
  height: 4px;
}

.overflow-x-auto::-webkit-scrollbar-thumb {
  background-color: rgb(0 0 0 / 10%);
  border-radius: 2px;
}

.dark .overflow-x-auto::-webkit-scrollbar-thumb {
  background-color: rgb(255 255 255 / 10%);
}

/* 自定义滚动条样式，使其更简洁 */
</style>
