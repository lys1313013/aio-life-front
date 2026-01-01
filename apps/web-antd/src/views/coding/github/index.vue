<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import { computed, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';
import { usePreferences } from '@vben/preferences';
import { useEcharts, EchartsUI } from '@vben/plugins/echarts';
import { useUserStore } from '@vben/stores';

import {
  BarChartOutlined,
  BranchesOutlined,
  CalendarOutlined,
  CoffeeOutlined,
  FileTextOutlined,
  FireOutlined,
  StarOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons-vue';
import {
  Alert,
  Card,
  message,
  Spin,
  Table,
  Tag,
  theme,
} from 'ant-design-vue';
import dayjs from 'dayjs';

defineOptions({ name: 'GithubGraph' });

const userStore = useUserStore();
const username = computed(() => userStore.userInfo?.githubUsername);
const githubToken = computed(() => userStore.userInfo?.githubToken);
const loading = ref(false);
const error = ref(false);
const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);
const { isDark } = usePreferences();
const { token } = theme.useToken();
const contributionData = ref<any>(null);

// Stats
const totalContributions = ref(0);
const maxContribution = ref(0);
const bestMonth = ref({ date: '', count: 0 });
const dailyAverage = ref('0');
const busiestDay = ref({ date: '', count: 0 });
const longestStreak = ref({ days: 0, start: '', end: '' });
const todayContribution = ref(0);

// Repository Stats
const repoList = ref<any[]>([]);
const reposLoading = ref(false);

function formatDate(date: string) {
  if (!date) return '-';
  return dayjs(date).format('YYYY-MM-DD HH:mm');
}

const columns = [
  {
    title: '仓库名',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: '语言',
    dataIndex: 'language',
    key: 'language',
  },
  {
    title: 'Stars',
    dataIndex: 'stargazers_count',
    key: 'stargazers_count',
  },
  {
    title: 'Forks',
    dataIndex: 'forks_count',
    key: 'forks_count',
  },
  {
    title: '最近更新',
    dataIndex: 'pushed_at',
    key: 'pushed_at',
  },
  {
    title: '个人提交数',
    dataIndex: 'myCommits',
    key: 'myCommits',
  },
];

async function fetchRepoStats(user: string, repos: any[]) {
  // Limit to top 20 to avoid immediate rate limit for heavy users
  const targetRepos = repos.slice(0, 30);

  for (const repo of targetRepos) {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${repo.full_name}/contributors?per_page=100`,
        {
          headers: {
            Authorization: `Bearer ${githubToken.value}`,
          },
        },
      );
      if (res.status === 403) {
        repo.myCommits = 'Rate Limit';
        repo.loadingStats = false;
        // Stop fetching if rate limit hit
        break;
      }
      if (!res.ok) {
        repo.myCommits = 'Error';
        repo.loadingStats = false;
        continue;
      }
      const contributors = await res.json();
      const contributor = contributors.find(
        (c: any) => c.login.toLowerCase() === user.toLowerCase(),
      );
      repo.myCommits = contributor ? contributor.contributions : 0;
    } catch {
      repo.myCommits = 'Error';
    } finally {
      repo.loadingStats = false;
    }
  }

  // Mark remaining as skipped
  repos.forEach(repo => {
    if (repo.loadingStats) {
      repo.myCommits = repo.myCommits === 'Loading...' ? '-' : repo.myCommits;
      repo.loadingStats = false;
    }
  });
}

async function fetchRepositories(user: string) {
  reposLoading.value = true;
  repoList.value = [];
  try {
    const res = await fetch(
      `https://api.github.com/users/${user}/repos?sort=pushed&per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${githubToken.value}`,
        },
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
  } catch (e) {
    console.error(e);
    message.error('获取仓库列表失败');
  } finally {
    reposLoading.value = false;
  }
}

const colorPieces = computed(() => {
  if (isDark.value) {
    return [
      { color: '#161b22', value: 0 },
      { color: '#0e4429', value: 1 },
      { color: '#006d32', value: 2 },
      { color: '#26a641', value: 3 },
      { color: '#39d353', value: 4 },
    ];
  }

  return [
    { color: '#ebedf0', value: 0 },
    { color: '#9be9a8', value: 1 },
    { color: '#40c463', value: 2 },
    { color: '#30a14e', value: 3 },
    { color: '#216e39', value: 4 },
  ];
});



async function fetchContributions(user: string) {
  try {
    loading.value = true;
    error.value = false;

    const query = `
      query {
        user(login: "${user}") {
          contributionsCollection {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  contributionCount
                  date
                  contributionLevel
                }
              }
            }
          }
        }
      }
    `;

    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${githubToken.value}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch data');
    }

    const res = await response.json();
    if (res.errors) {
      throw new Error(res.errors[0].message);
    }

    const calendar = res.data.user.contributionsCollection.contributionCalendar;
    const contributions = [];

    const mapLevel = (level: string) => {
      switch (level) {
        case 'NONE':
          return 0;
        case 'FIRST_QUARTILE':
          return 1;
        case 'SECOND_QUARTILE':
          return 2;
        case 'THIRD_QUARTILE':
          return 3;
        case 'FOURTH_QUARTILE':
          return 4;
        default:
          return 0;
      }
    };

    for (const week of calendar.weeks) {
      for (const day of week.contributionDays) {
        contributions.push({
          date: day.date,
          count: day.contributionCount,
          level: mapLevel(day.contributionLevel),
        });
      }
    }

    contributionData.value = { contributions };
  } catch (err) {
    error.value = true;
    contributionData.value = null;
    console.error(err);
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

  const total = windowed.reduce((acc, item) => acc + item.count, 0);
  totalContributions.value = total;
  maxContribution.value = Math.max(...windowed.map((item) => item.count));

  // 2. Daily Average
  dailyAverage.value = (total / windowed.length).toFixed(1);

  // 3. Best Month
  const monthMap = new Map<string, number>();
  windowed.forEach((item) => {
    const month = item.date.substring(0, 7); // YYYY-MM
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
  let currentStreak = 0;
  let maxStreakStart = '';
  let maxStreakEnd = '';
  let currentStreakStart = '';

  windowed.forEach((item) => {
    // Streak Logic
    if (item.count > 0) {
      if (currentStreak === 0) {
        currentStreakStart = item.date;
      }
      currentStreak++;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
        maxStreakStart = currentStreakStart;
        maxStreakEnd = item.date;
      }
    } else {
      currentStreak = 0;
    }
  });

  longestStreak.value = {
    days: maxStreak,
    start: maxStreak > 0 ? dayjs(maxStreakStart).format('M月D日') : '-',
    end: maxStreak > 0 ? dayjs(maxStreakEnd).format('M月D日') : '-',
  };

  const recentData = windowed.map((item) => [item.date, item.level, item.count]);

  const startDate = recentData.at(0)?.[0];
  const endDate = recentData.at(-1)?.[0];
  if (!startDate || !endDate) return;

  renderEcharts(() => ({
    tooltip: {
      formatter: (params: any) => {
        const date = params?.value?.[0] ?? '';
        const count = params?.value?.[2] ?? 0;
        return `${date}<br/>Contributions: <strong>${count}</strong>`;
      },
      backgroundColor: token.value.colorBgElevated,
      borderColor: token.value.colorBorderSecondary,
      textStyle: {
        color: token.value.colorText,
      },
    },
    visualMap: {
      show: false,
      min: 0,
      max: 4,
      dimension: 1,
      type: 'piecewise',
      pieces: colorPieces.value.map((p) => ({ value: p.value, color: p.color })),
    },
    calendar: {
      top: 45,
      left: 36,
      right: 12,
      range: [startDate, endDate],
      cellSize: 13,
      splitLine: {
        show: false,
      },
      yearLabel: { show: false },
      dayLabel: {
        firstDay: 0,
        nameMap: ['', 'Mon', '', 'Wed', '', 'Fri', ''],
        margin: 10,
        color: token.value.colorTextSecondary,
      },
      monthLabel: {
        margin: 10,
        color: token.value.colorTextSecondary,
      },
    },
    series: {
      type: 'heatmap',
      coordinateSystem: 'calendar',
      data: recentData,
      itemStyle: {
        borderRadius: 2,
        borderWidth: 3,
        borderColor: token.value.colorBgContainer,
      },
    },
  }));
}

let hasWarnedNoUsername = false;

watch(
  [contributionData, () => token.value.colorBgContainer, isDark],
  () => {
    updateChart();
  },
);

watch(
  username,
  async (user) => {
    if (!user) {
      if (!hasWarnedNoUsername) {
        message.warning('未设置 Github 用户名，无法显示贡献图');
        hasWarnedNoUsername = true;
      }
      return;
    }
    hasWarnedNoUsername = false;
    await Promise.all([fetchContributions(user), fetchRepositories(user)]);
  },
  { immediate: true },
);
</script>

<template>
  <Page title="">
    <div class="p-4">
      <Spin :spinning="loading" tip="加载中...">
        <div v-if="error" class="w-full py-12 text-center">
          <Alert
            description="无法加载数据，请检查网络连接。"
            message="加载失败"
            show-icon
            type="error"
            class="inline-block text-left"
          />
        </div>

        <div v-show="!error && !loading" class="w-full overflow-x-auto">
          <div class="min-w-[760px] pr-4">
            <!-- Stats Grid -->
            <div class="mb-6 grid grid-cols-1 gap-4 pl-2 md:grid-cols-3">
              <!-- Best Month -->
              <Card :bordered="false" class="shadow-sm">
                <div class="flex items-center gap-3">
                  <div class="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
                    <CalendarOutlined class="text-lg text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div class="text-xs text-gray-500">这一年的高光月份</div>
                    <div class="flex items-baseline gap-2">
                      <span class="text-base font-medium">{{ bestMonth.date }}</span>
                    </div>
                  </div>
                </div>
              </Card>

              <!-- Daily Average -->
              <Card :bordered="false" class="shadow-sm">
                <div class="flex items-center gap-3">
                  <div class="rounded-full bg-green-100 p-2 dark:bg-green-900/30">
                    <BarChartOutlined class="text-lg text-green-600 dark:text-green-400" />
                  </div>
                  <div class="w-full">
                    <div class="flex items-center justify-between">
                      <div class="text-xs text-gray-500">日均贡献</div>
                      <span class="text-lg font-bold">{{ dailyAverage }}</span>
                    </div>
                  </div>
                </div>
              </Card>

              <!-- Total Contributions -->
              <Card :bordered="false" class="shadow-sm">
                <div class="flex items-center gap-3">
                  <div class="rounded-full bg-purple-100 p-2 dark:bg-purple-900/30">
                    <FileTextOutlined class="text-lg text-purple-600 dark:text-purple-400" />
                  </div>
                  <div class="w-full">
                    <div class="flex items-center justify-between">
                      <div class="text-xs text-gray-500">最近一年总贡献</div>
                      <span class="text-lg font-bold">{{ totalContributions }}</span>
                    </div>
                  </div>
                </div>
              </Card>

              <!-- Busiest Day -->
              <Card :bordered="false" class="shadow-sm">
                <div class="flex items-center gap-3">
                  <div class="rounded-full bg-orange-100 p-2 dark:bg-orange-900/30">
                    <ThunderboltOutlined class="text-lg text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <div class="text-xs text-gray-500">你最活跃的一天</div>
                    <div class="mt-1">
                      <span class="mr-1 text-2xl font-bold">{{ busiestDay.count }}</span>
                      <span class="text-xs text-gray-500">次贡献</span>
                    </div>
                    <div class="text-xs text-gray-400">{{ busiestDay.date }}</div>
                  </div>
                </div>
              </Card>

              <!-- Longest Streak -->
              <Card :bordered="false" class="shadow-sm">
                <div class="flex items-center gap-3">
                  <div class="rounded-full bg-red-100 p-2 dark:bg-red-900/30">
                    <FireOutlined class="text-lg text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <div class="text-xs text-gray-500">最长连续打卡</div>
                    <div class="mt-1">
                      <span class="mr-1 text-2xl font-bold">{{ longestStreak.days }}</span>
                      <span class="text-xs text-gray-500">天</span>
                    </div>
                    <div class="text-xs text-gray-400">
                      {{ longestStreak.start }} - {{ longestStreak.end }}
                    </div>
                  </div>
                </div>
              </Card>

              <!-- Today's Contribution -->
              <Card :bordered="false" class="shadow-sm">
                <div class="flex items-center gap-3">
                  <div class="rounded-full bg-cyan-100 p-2 dark:bg-cyan-900/30">
                    <CheckCircleOutlined class="text-lg text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <div class="text-xs text-gray-500">今日贡献次数</div>
                    <div class="mt-1">
                      <span class="mr-1 text-2xl font-bold">{{ todayContribution }}</span>
                      <span class="text-xs text-gray-500">次</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
            <EchartsUI ref="chartRef" height="160px" />

            <div class="mt-4">
              <h3 class="mb-4 text-lg font-medium text-gray-800 dark:text-gray-200">
                仓库贡献统计
              </h3>
              <Table
                :columns="columns"
                :data-source="repoList"
                :loading="reposLoading"
                :pagination="{ pageSize: 10 }"
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
                    <Tag v-if="record.language" color="blue">{{
                      record.language
                    }}</Tag>
                  </template>
                  <template v-if="column.key === 'stargazers_count'">
                    <div class="flex items-center gap-1">
                      <StarOutlined class="text-yellow-500" />
                      <span>{{ record.stargazers_count }}</span>
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
                    <div
                      v-if="record.loadingStats"
                      class="flex items-center gap-2"
                    >
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
          </div>
        </div>
      </Spin>
    </div>
  </Page>
</template>
