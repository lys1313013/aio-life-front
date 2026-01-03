<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { Card, message, Skeleton, theme } from 'ant-design-vue';
import dayjs from 'dayjs';

import ContributionGraph from '../components/ContributionGraph.vue';
import { useUserStore } from '@vben/stores';

defineOptions({ name: 'LeetCode' });

const userStore = useUserStore();
const username = computed(() => userStore.userInfo?.leetcodeAcct);

const profileLoading = ref(false);
const contestLoading = ref(false);
const calendarLoading = ref(false);
const dailyQuestionLoading = ref(false);
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
  siteRanking: number;
  profile: {
    countryName?: string | null;
    reputation?: number | null;
  };
};
type ContestRanking = {
  attendedContestsCount: number;
  rating: number;
  globalRanking: number;
  localRanking: number;
  globalTotalParticipants: number;
  localTotalParticipants: number;
  topPercentage: number;
};
type RecentACSubmission = {
  submissionId: string;
  submitTime: number;
  question: {
    title: string;
    translatedTitle: string;
    titleSlug: string;
    questionFrontendId: string;
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
const contestInfo = ref<ContestRanking | null>(null);
const questionProgress = ref<QuestionProgress | null>(null);
const dailyQuestionStatus = ref<string>('');
const dailyQuestion = ref<DailyQuestion['todayRecord'][0]['question'] | null>(
  null,
);
const currentStreak = ref(0);
const totalActiveDays = ref(0);
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

async function fetchProfileData() {
  profileLoading.value = true;
  try {
    const res = await requestLeetCode<{
      userProfilePublicProfile: PublicProfile;
      userProfileUserQuestionProgress: QuestionProgress;
    }>(
      `
          query getUserData($userSlug: String!) {
            userProfilePublicProfile(userSlug: $userSlug) {
              siteRanking
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
    );
    userInfo.value = res.userProfilePublicProfile;
    questionProgress.value = res.userProfileUserQuestionProgress;
  } catch (error) {
    message.error('获取用户信息失败');
    console.error(error);
  } finally {
    profileLoading.value = false;
  }
}

async function fetchContestData() {
  contestLoading.value = true;
  try {
    const res = await requestLeetCode<{ userContestRanking: ContestRanking }>(
      `
          query userContestRankingInfo($userSlug: String!) {
            userContestRanking(userSlug: $userSlug) {
              attendedContestsCount
              rating
              globalRanking
              localRanking
              globalTotalParticipants
              localTotalParticipants
              topPercentage
            }
          }
        `,
      { userSlug: username.value },
      {
        operationName: 'userContestRankingInfo',
        path: '/leetcode-api/graphql/noj-go/',
      },
    );
    contestInfo.value = res.userContestRanking;
  } catch (error) {
    console.error('获取竞赛信息失败', error);
  } finally {
    contestLoading.value = false;
  }
}

async function fetchCalendarData() {
  calendarLoading.value = true;
  try {
    const range = getGreenWallRange();
    const res = await requestLeetCode<{ userCalendar: UserCalendar }>(
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
    );
    renderGreenWall(res.userCalendar, range.start, range.end);
  } catch (error) {
    console.error('获取日历数据失败', error);
  } finally {
    calendarLoading.value = false;
  }
}

async function fetchDailyQuestionData() {
  dailyQuestionLoading.value = true;
  try {
    const [dailyQuestionRes, recentSubRes] = await Promise.allSettled([
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
      requestLeetCode<{ recentACSubmissions: RecentACSubmission[] }>(
        `
          query recentAcSubmissions($userSlug: String!) {
            recentACSubmissions(userSlug: $userSlug) {
              submissionId
              submitTime
              question {
                title
                translatedTitle
                titleSlug
                questionFrontendId
              }
            }
          }
        `,
        { userSlug: username.value },
        {
          operationName: 'recentAcSubmissions',
          path: '/leetcode-api/graphql/noj-go/',
        },
      ),
    ]);

    let todayRecord: DailyQuestion['todayRecord'][0] | null = null;
    if (dailyQuestionRes.status === 'fulfilled') {
      todayRecord = dailyQuestionRes.value.todayRecord?.[0] || null;
      dailyQuestionStatus.value = todayRecord?.userStatus || 'Unknown';
      dailyQuestion.value = todayRecord?.question || null;
    }

    if (
      todayRecord &&
      dailyQuestionStatus.value !== 'Finish' &&
      recentSubRes.status === 'fulfilled' &&
      recentSubRes.value.recentACSubmissions
    ) {
      const dailySlug = todayRecord.question.titleSlug;
      const dailyDate = todayRecord.date; // YYYY-MM-DD
      const startTime = new Date(`${dailyDate}T00:00:00+08:00`).getTime() / 1000;
      const endTime = new Date(`${dailyDate}T23:59:59+08:00`).getTime() / 1000;

      const isFinished = recentSubRes.value.recentACSubmissions.some((sub) => {
        if (sub.question.titleSlug !== dailySlug) {
          return false;
        }
        const ts = sub.submitTime;
        return ts >= startTime && ts <= endTime;
      });

      if (isFinished) {
        dailyQuestionStatus.value = 'Finish';
      }
    }
  } catch (error) {
    console.error('获取每日一题数据失败', error);
  } finally {
    dailyQuestionLoading.value = false;
  }
}

function fetchData() {
  fetchProfileData();
  fetchContestData();
  fetchCalendarData();
  fetchDailyQuestionData();
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
  let tempStreak = 0;
  let maxStreak = 0;
  let prevDate: dayjs.Dayjs | null = null;

  for (const dateStr of sortedDates) {
    if ((countByDate.get(dateStr) || 0) > 0) {
      const d = dayjs(dateStr);
      if (prevDate && d.diff(prevDate, 'day') === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
      maxStreak = Math.max(maxStreak, tempStreak);
      prevDate = d;
    }
  }

  // Calculate recent streak
  let recentStreakVal = 0;
  const lastDateStr = sortedDates[sortedDates.length - 1];
  if (lastDateStr) {
    const todayStr = dayjs().format('YYYY-MM-DD');
    const yesterdayStr = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

    if (lastDateStr === todayStr || lastDateStr === yesterdayStr) {
      let checkDate = dayjs(lastDateStr);
      while (countByDate.has(checkDate.format('YYYY-MM-DD'))) {
        recentStreakVal++;
        checkDate = checkDate.subtract(1, 'day');
      }
    }
  }
  currentStreak.value = recentStreakVal;
  totalActiveDays.value = calendar.totalActiveDays;

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

function goToDailyQuestion() {
  if (dailyQuestion.value?.titleSlug) {
    window.open(
      `https://leetcode.cn/problems/${dailyQuestion.value.titleSlug}`,
      '_blank',
    );
  }
}

onMounted(() => {
  fetchData();
});
</script>

<template>
  <Page title="" content-class="p-0">
    <div class="p-2 md:p-4">
      <!-- Ranking Info Card Group -->
      <div class="mb-4 grid grid-cols-2 gap-2 md:gap-3 md:grid-cols-4">
        <Card :bordered="false" class="shadow-sm" :body-style="{ padding: '12px' }">
          <div class="text-xs md:text-sm" :style="{ color: token.colorTextSecondary }">
            全站排名
          </div>
          <Skeleton :active="true" :loading="profileLoading" :paragraph="{ rows: 0 }">
            <div class="text-lg font-bold tabular-nums md:text-2xl">
              {{ userInfo?.siteRanking?.toLocaleString() || '-' }}
            </div>
          </Skeleton>
        </Card>

        <Card :bordered="false" class="shadow-sm" :body-style="{ padding: '12px' }">
          <div class="text-xs md:text-sm" :style="{ color: token.colorTextSecondary }">
            竞赛分数
          </div>
          <Skeleton :active="true" :loading="contestLoading" :paragraph="{ rows: 0 }">
            <div class="text-lg font-bold tabular-nums md:text-2xl">
              {{ Math.round(contestInfo?.rating || 0) || '-' }}
            </div>
          </Skeleton>
        </Card>

        <Card :bordered="false" class="shadow-sm" :body-style="{ padding: '12px' }">
          <div class="text-xs md:text-sm" :style="{ color: token.colorTextSecondary }">
            全球排名
          </div>
          <Skeleton :active="true" :loading="contestLoading" :paragraph="{ rows: 0 }">
            <div class="flex items-baseline gap-1">
              <span class="text-lg font-bold tabular-nums md:text-2xl">
                {{ contestInfo?.globalRanking?.toLocaleString() || '-' }}
              </span>
              <span v-if="contestInfo?.globalTotalParticipants" class="text-[10px] text-gray-400 md:text-xs">
                / {{ contestInfo.globalTotalParticipants.toLocaleString() }}
              </span>
            </div>
          </Skeleton>
        </Card>

        <Card :bordered="false" class="shadow-sm" :body-style="{ padding: '12px' }">
          <div class="text-xs md:text-sm" :style="{ color: token.colorTextSecondary }">
            全国排名
          </div>
          <Skeleton :active="true" :loading="contestLoading" :paragraph="{ rows: 0 }">
            <div class="flex items-baseline gap-1">
              <span class="text-lg font-bold tabular-nums md:text-2xl">
                {{ contestInfo?.localRanking?.toLocaleString() || '-' }}
              </span>
              <span v-if="contestInfo?.localTotalParticipants" class="text-[10px] text-gray-400 md:text-xs">
                / {{ contestInfo.localTotalParticipants.toLocaleString() }}
              </span>
            </div>
          </Skeleton>
        </Card>
      </div>

      <!-- User Info Card -->
      <Card class="mb-4" :body-style="{ padding: '12px' }">
        <div class="mb-4 grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3">
          <Card :bordered="false" class="bg-gray-50/50 shadow-none dark:bg-gray-800/20" :body-style="{ padding: '12px' }">
            <div class="text-xs md:text-sm" :style="{ color: token.colorTextSecondary }">
              已解题
            </div>
            <Skeleton
              :active="true"
              :loading="profileLoading"
              :paragraph="{ rows: 0 }"
            >
              <div class="text-lg font-bold tabular-nums md:text-2xl">
                {{ totalSolved }}
                <span class="text-xs font-normal text-gray-400 md:text-base">
                  / {{ totalQuestions }}
                </span>
              </div>
            </Skeleton>
          </Card>
          <Card :bordered="false" class="bg-gray-50/50 shadow-none dark:bg-gray-800/20" :body-style="{ padding: '12px' }">
            <div class="text-xs md:text-sm" :style="{ color: token.colorTextSecondary }">
              声望
            </div>
            <Skeleton
              :active="true"
              :loading="profileLoading"
              :paragraph="{ rows: 0 }"
            >
              <div class="text-lg font-bold tabular-nums md:text-2xl">
                {{ userInfo?.profile?.reputation ?? 0 }}
              </div>
            </Skeleton>
          </Card>
          <Card :bordered="false" class="bg-gray-50/50 shadow-none dark:bg-gray-800/20" :body-style="{ padding: '12px' }">
            <div class="text-xs md:text-sm" :style="{ color: token.colorTextSecondary }">
              累计活跃天数
            </div>
            <Skeleton
              :active="true"
              :loading="calendarLoading"
              :paragraph="{ rows: 0 }"
            >
              <div class="text-lg font-bold md:text-2xl">{{ totalActiveDays }} 天</div>
            </Skeleton>
          </Card>
          <Card :bordered="false" class="bg-gray-50/50 shadow-none dark:bg-gray-800/20" :body-style="{ padding: '12px' }">
            <div class="text-xs md:text-sm" :style="{ color: token.colorTextSecondary }">
              最活跃的一天
            </div>
            <Skeleton
              :active="true"
              :loading="calendarLoading"
              :paragraph="{ rows: 0 }"
            >
              <div class="flex flex-col">
                <div class="text-lg font-bold tabular-nums md:text-2xl">
                  {{ mostActiveDay?.count || 0 }}
                  <span class="text-xs font-normal text-gray-400 md:text-sm">次提交</span>
                </div>
                <div class="text-[10px] text-gray-400 md:text-xs">
                  {{ mostActiveDay?.date || '-' }}
                </div>
              </div>
            </Skeleton>
          </Card>
          <Card :bordered="false" class="bg-gray-50/50 shadow-none dark:bg-gray-800/20" :body-style="{ padding: '12px' }">
            <div class="text-xs md:text-sm" :style="{ color: token.colorTextSecondary }">
              今日提交次数
            </div>
            <Skeleton
              :active="true"
              :loading="calendarLoading"
              :paragraph="{ rows: 0 }"
            >
              <div class="text-lg font-bold md:text-2xl">
                {{ todaySubmissions }}
              </div>
            </Skeleton>
          </Card>
          <Card
            :bordered="false"
            class="cursor-pointer bg-gray-50/50 shadow-none hover:shadow-md dark:bg-gray-800/20"
            :body-style="{ padding: '12px' }"
            @click="goToDailyQuestion"
          >
            <div class="text-xs md:text-sm" :style="{ color: token.colorTextSecondary }">
              每日一题
            </div>
            <Skeleton
              :active="true"
              :loading="dailyQuestionLoading"
              :paragraph="{ rows: 0 }"
            >
              <div
                class="text-lg font-bold md:text-2xl"
                :class="{
                  'text-red-500': dailyQuestionStatus !== 'Finish',
                  'text-green-500': dailyQuestionStatus === 'Finish',
                }"
              >
                {{ dailyQuestionStatus === 'Finish' ? '已完成' : '未完成' }}
              </div>
            </Skeleton>
          </Card>
        </div>

        <h3 class="mb-4 text-lg font-bold">做题进度</h3>
        <Skeleton :active="true" :loading="profileLoading">
          <div
            v-if="questionProgress"
            class="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3"
          >
            <div
              v-for="item in progressDisplayList"
              :key="item.difficulty"
              class="rounded-lg border p-2 text-center md:p-4"
            >
              <div
                :style="{ color: getDifficultyColor(item.difficulty) }"
                class="mb-1 text-sm font-bold md:mb-2 md:text-lg"
              >
                {{ getDifficultyLabel(item.difficulty) }}
              </div>
              <div class="text-lg font-bold tabular-nums md:text-2xl">
                {{ item.count }}
                <span class="text-xs font-normal text-gray-400 md:text-sm">
                  / {{ getTotalCount(item.difficulty) }}
                </span>
              </div>
            </div>
          </div>
        </Skeleton>
      </Card>

      <Card :bordered="false" class="shadow-sm" :body-style="{ padding: '12px' }">
        <template #title>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-sm md:text-base">过去一年共提交 {{ totalCommits }} 次</span>
            <span class="text-[10px] font-normal text-gray-500 dark:text-gray-400 md:text-xs">
              连续提交:
              <span class="font-medium text-purple-600 dark:text-purple-400">
                {{ currentStreak }}
              </span>
              天
            </span>
          </div>
        </template>

        <Skeleton
          :active="true"
          :loading="calendarLoading"
          :paragraph="{ rows: 4 }"
        >
          <div class="h-[180px] w-full md:h-[220px]">
            <ContributionGraph :data="graphData" />
          </div>
        </Skeleton>
      </Card>
    </div>
  </Page>
</template>

<style scoped>
/* 移除之前的 skeleton-white 样式 */
</style>
