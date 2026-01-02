<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { Card, message, Spin, theme } from 'ant-design-vue';
import dayjs from 'dayjs';

import ContributionGraph from '../components/ContributionGraph.vue';

defineOptions({ name: 'LeetCode' });

const username = ref('lys1313013');
const loading = ref(false);
const totalCommits = ref(0);
const graphData = ref<any[]>([]);
const { token } = theme.useToken();


type Difficulty = 'EASY' | 'HARD' | 'MEDIUM';
type DifficultyStat = { count: number; difficulty: Difficulty };
type QuestionProgress = {
  numAcceptedQuestions: DifficultyStat[];
  numFailedQuestions: DifficultyStat[];
  numUntouchedQuestions: DifficultyStat[];
};
type PublicProfile = {
  profile: {
    countryName?: string | null;
    reputation?: number | null;
  };
};
type DailyQuestion = {
  todayRecord: Array<{
    date: string;
    userStatus: string;
    question: {
      title: string;
      titleSlug: string;
      translatedTitle?: string;
    };
  }>;
};

type UserCalendar = {
  activeYears: number[];
  recentStreak: number;
  streak: number;
  submissionCalendar: string; // JSON string "timestamp": count
  totalActiveDays: number;
};

const userInfo = ref<PublicProfile | null>(null);
const questionProgress = ref<QuestionProgress | null>(null);
const dailyQuestionStatus = ref<string>('');
const longestStreak = ref(0);
const mostActiveDay = ref<{ count: number; date: string } | null>(null);
const todaySubmissions = ref(0);

const totalSolved = computed(() => {
  const list = questionProgress.value?.numAcceptedQuestions ?? [];
  return list.reduce((sum, cur) => sum + (cur.count || 0), 0);
});

const totalQuestions = computed(() => {
  const progress = questionProgress.value;
  if (!progress) {
    return 0;
  }
  const { numAcceptedQuestions, numFailedQuestions, numUntouchedQuestions } =
    progress;
  const sum = (list: DifficultyStat[]) =>
    list.reduce((acc, cur) => acc + (cur.count || 0), 0);
  return (
    sum(numAcceptedQuestions) + sum(numFailedQuestions) + sum(numUntouchedQuestions)
  );
});

const progressDisplayList = computed(() => {
  const list = questionProgress.value?.numAcceptedQuestions ?? [];
  return [
    {
      count: totalSolved.value,
      difficulty: 'ALL' as Difficulty,
    },
    ...list,
  ];
});

function getGreenWallRange() {
  const end = dayjs().startOf('day');
  const start = end.subtract(364, 'day');
  return { end, requestSize: 30, start };
}

async function fetchData() {
  loading.value = true;
  try {
    const range = getGreenWallRange();
    const [profileRes, calendarRes, dailyQuestionRes] = await Promise.all([
      requestLeetCode<{
        userProfilePublicProfile: PublicProfile;
        userProfileUserQuestionProgress: QuestionProgress;
      }>(
        `
          query getUserData($userSlug: String!) {
            userProfilePublicProfile(userSlug: $userSlug) {
              profile {
                reputation
                countryName
              }
            }
            userProfileUserQuestionProgress(userSlug: $userSlug) {
              numAcceptedQuestions {
                difficulty
                count
              }
              numFailedQuestions {
                difficulty
                count
              }
              numUntouchedQuestions {
                difficulty
                count
              }
            }
          }
        `,
        { userSlug: username.value },
      ),
      requestLeetCode<{ userCalendar: UserCalendar }>(
        `
          query userProfileCalendar($userSlug: String!, $year: Int) {
            userCalendar(userSlug: $userSlug, year: $year) {
              streak
              totalActiveDays
              submissionCalendar
              activeYears
              recentStreak
            }
          }
        `,
        { userSlug: username.value },
        {
          operationName: 'userProfileCalendar',
          path: '/leetcode-api/graphql/noj-go/',
        },
      ),
      requestLeetCode<DailyQuestion>(
        `
          query questionOfToday {
            todayRecord {
              date
              userStatus
              question {
                title
                titleSlug
                translatedTitle
              }
            }
          }
        `,
      ),
    ]);

    userInfo.value = profileRes.userProfilePublicProfile;
    questionProgress.value = profileRes.userProfileUserQuestionProgress;
    const todayRecord = dailyQuestionRes.todayRecord?.[0];
    dailyQuestionStatus.value = todayRecord?.userStatus || 'Unknown';

    renderGreenWall(calendarRes.userCalendar, range.start, range.end);
  } catch (error) {
    message.error('获取 LeetCode 数据失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
}

async function requestLeetCode<T>(
  query: string,
  variables?: Record<string, any>,
  options: {
    headers?: Record<string, string>;
    operationName?: string;
    path?: string;
  } = {},
): Promise<T> {
  const { path = '/leetcode-api/graphql', headers = {}, operationName } = options;
  const body: Record<string, any> = { query, variables };
  if (operationName) {
    body.operationName = operationName;
  }

  const res = await fetch(path, {
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', ...headers },
    method: 'POST',
  });

  const rawText = await res.text().catch(() => '');
  if (!res.ok) {
    throw new Error(
      `HTTP ${res.status} ${res.statusText}${rawText ? `: ${rawText}` : ''}`,
    );
  }

  if (!rawText) {
    throw new Error('响应为空');
  }

  const json = JSON.parse(rawText);
  const { data, errors } = json;
  if (errors?.length) {
    throw new Error(errors[0]?.message || 'GraphQL 请求失败');
  }
  return data as T;
}

function renderGreenWall(
  calendar: UserCalendar,
  start: dayjs.Dayjs,
  end: dayjs.Dayjs,
) {
  const submissionMap = JSON.parse(calendar.submissionCalendar || '{}');
  const countByDate = new Map<string, number>();

  for (const [ts, count] of Object.entries(submissionMap)) {
    // timestamp is in seconds
    const date = dayjs.unix(Number(ts)).format('YYYY-MM-DD');
    countByDate.set(date, Number(count));
  }

  const today = dayjs().format('YYYY-MM-DD');
  todaySubmissions.value = countByDate.get(today) || 0;

  let maxVal = 0;
  let maxDate = '';
  countByDate.forEach((val, key) => {
    if (val > maxVal) {
      maxVal = val;
      maxDate = key;
    }
  });
  mostActiveDay.value = { count: maxVal, date: maxDate };

  const sortedDates = Array.from(countByDate.keys()).sort();
  let currentStreak = 0;
  let maxStreak = 0;
  let prevDate: dayjs.Dayjs | null = null;

  for (const dateStr of sortedDates) {
    if ((countByDate.get(dateStr) || 0) > 0) {
      const d = dayjs(dateStr);
      if (prevDate && d.diff(prevDate, 'day') === 1) {
        currentStreak++;
      } else {
        currentStreak = 1;
      }
      maxStreak = Math.max(maxStreak, currentStreak);
      prevDate = d;
    }
  }
  longestStreak.value = maxStreak;

  const data: { date: string; count: number }[] = [];
  let maxCount = 0;
  let total = 0;
  const days = end.diff(start, 'day');
  for (let i = 0; i <= days; i++) {
    const curDay = start.add(i, 'day');
    const date = curDay.format('YYYY-MM-DD');
    const count = countByDate.get(date) || 0;

    data.push({ date, count });
    maxCount = Math.max(maxCount, count);
    total += count;
  }
  totalCommits.value = total;

  const limit = Math.max(5, maxCount);
  graphData.value = data.map((item) => {
    let level = 0;
    if (item.count > 0) {
      level = Math.ceil((item.count / limit) * 4);
      if (level > 4) level = 4;
    }
    return {
      ...item,
      level,
    };
  });
}

function getDifficultyColor(difficulty: string) {
  switch (difficulty) {
    case 'EASY':
      return '#00b8a3';
    case 'MEDIUM':
      return '#ffc01e';
    case 'HARD':
      return '#ef4743';
    case 'ALL':
      return '#2db55d';
    default:
      return '#ccc';
  }
}

function getDifficultyLabel(difficulty: string) {
  switch (difficulty) {
    case 'EASY':
      return '简单';
    case 'MEDIUM':
      return '中等';
    case 'HARD':
      return '困难';
    case 'ALL':
      return '总计';
    default:
      return difficulty;
  }
}

function getTotalCount(difficulty: string) {
  if (difficulty === 'ALL') {
    return totalQuestions.value;
  }
  const progress = questionProgress.value;
  if (!progress) {
    return 0;
  }
  const accepted =
    progress.numAcceptedQuestions.find((i) => i.difficulty === difficulty)
      ?.count ?? 0;
  const failed =
    progress.numFailedQuestions.find((i) => i.difficulty === difficulty)
      ?.count ?? 0;
  const untouched =
    progress.numUntouchedQuestions.find((i) => i.difficulty === difficulty)
      ?.count ?? 0;
  return accepted + failed + untouched;
}

onMounted(() => {
  fetchData();
});
</script>

<template>
  <Page title="LeetCode 统计">
    <div class="p-4">
      <Spin :spinning="loading">
        <!-- User Info Card -->
        <Card v-if="userInfo" class="mb-4">
          <div class="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <Card :bordered="false" class="shadow-sm">
              <div class="text-sm" :style="{ color: token.colorTextSecondary }">
                已解题
              </div>
              <div class="text-2xl font-bold tabular-nums">
                {{ totalSolved }}
                <span class="text-base font-normal text-gray-400">
                  / {{ totalQuestions }}
                </span>
              </div>
            </Card>
            <Card :bordered="false" class="shadow-sm">
              <div class="text-sm" :style="{ color: token.colorTextSecondary }">
                声望
              </div>
              <div class="text-2xl font-bold tabular-nums">
                {{ userInfo.profile?.reputation ?? 0 }}
              </div>
            </Card>
            <Card :bordered="false" class="shadow-sm">
              <div class="text-sm" :style="{ color: token.colorTextSecondary }">
                最长连续打卡
              </div>
              <div class="text-2xl font-bold">{{ longestStreak }} 天</div>
            </Card>
            <Card :bordered="false" class="shadow-sm">
              <div class="text-sm" :style="{ color: token.colorTextSecondary }">
                最活跃的一天
              </div>
              <div class="text-xl font-bold">
                {{ mostActiveDay?.date || '-' }} ({{
                  mostActiveDay?.count || 0
                }})
              </div>
            </Card>
            <Card :bordered="false" class="shadow-sm">
              <div class="text-sm" :style="{ color: token.colorTextSecondary }">
                今日提交次数
              </div>
              <div class="text-2xl font-bold">
                {{ todaySubmissions }}
              </div>
            </Card>
            <Card :bordered="false" class="shadow-sm">
              <div class="text-sm" :style="{ color: token.colorTextSecondary }">
                每日一题是否完成
              </div>
              <div class="text-2xl font-bold">
                {{ dailyQuestionStatus === 'Finish' ? '已完成' : '未完成' }}
              </div>
            </Card>
          </div>

          <h3 class="mb-4 text-lg font-bold">做题进度</h3>
          <div
            v-if="questionProgress"
            class="grid grid-cols-1 gap-4 md:grid-cols-4"
          >
            <div
              v-for="item in progressDisplayList"
              :key="item.difficulty"
              class="rounded-lg border p-4 text-center"
            >
              <div
                :style="{ color: getDifficultyColor(item.difficulty) }"
                class="mb-2 text-lg font-bold"
              >
                {{ getDifficultyLabel(item.difficulty) }}
              </div>
              <div class="text-2xl font-bold">
                {{ item.count }}
                <span class="text-base font-normal text-gray-400">
                  / {{ getTotalCount(item.difficulty) }}
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card
          :bordered="false"
          :title="`过去一年共提交 ${totalCommits} 次 `"
          class="shadow-sm"
        >
          <div class="h-[220px] w-full">
            <ContributionGraph :data="graphData" />
          </div>
        </Card>
      </Spin>
    </div>
  </Page>
</template>
