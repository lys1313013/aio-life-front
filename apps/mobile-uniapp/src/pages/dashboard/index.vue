<template>
  <scroll-view
    scroll-y
    class="container scroll-area"
    refresher-enabled
    @refresherrefresh="onRefresh"
    :refresher-triggered="isRefreshing"
  >
    <!-- 顶部数据大盘 (5个卡片) -->
    <view class="overview-grid" v-if="cardDetails.length > 0">
      <view
        class="overview-card"
        v-for="(card, index) in cardDetails"
        :key="index"
        @click="handleCardClick(card.titleClickUrl)"
      >
        <view class="card-top">
          <text class="card-title">{{ card.title }}</text>
        </view>
        <view class="card-middle">
          <text class="card-value" :style="{ color: card.valueColor || '#333' }">
            {{ card.value }}
          </text>
          <view class="card-icon" v-if="card.icon" :style="getIconifyStyle(card.icon, true)"></view>
        </view>
        <view class="card-bottom" v-if="card.totalTitle">
          <text class="card-total">{{ card.totalTitle }}</text>
          <text class="card-total-value">{{ card.totalValue }}</text>
        </view>
      </view>
    </view>
    <!-- 顶部数据大盘骨架屏 -->
    <view class="overview-grid" v-else-if="loading">
      <view class="overview-card" v-for="i in 4" :key="i">
        <view class="skeleton-text title"></view>
        <view style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx;">
          <view class="skeleton-text" style="width: 40%; height: 32rpx; margin-bottom: 0;"></view>
          <view class="skeleton-block" style="width: 40rpx; height: 40rpx; border-radius: 50%;"></view>
        </view>
        <view style="display: flex; justify-content: space-between;">
          <view class="skeleton-text" style="width: 40%; height: 20rpx;"></view>
          <view class="skeleton-text" style="width: 20%; height: 20rpx;"></view>
        </view>
      </view>
    </view>

    <!-- 时迹 (复刻 Web 端 CSS 时间轴与环形图) -->
    <view class="panel" v-if="loading">
      <view class="panel-header">
        <view class="skeleton-text" style="width: 160rpx; height: 30rpx;"></view>
      </view>
      <view class="panel-body">
        <view class="skeleton-block" style="height: 280rpx;"></view>
      </view>
    </view>

    <view class="panel" v-else>
      <view class="panel-header" @click="refreshTimeTracker">
        <text class="panel-title" @click.stop="navigateTo('/pages/time/time-tracker/index')">时迹</text>
        <view class="header-add-btn" @click.stop="navigateTo('/pages/subPages/timeTracker/index')">+</view>
      </view>
      <view class="panel-body time-tracker-body">
        <template v-if="timeRecords.length > 0">
          <!-- 左侧 24 小时时间轴 -->
          <view class="timeline-24h">
            <text class="time-label">0</text>
            <view class="timeline-track">
              <view
                v-for="block in timelineBlocks"
                :key="block.id"
                class="timeline-block"
                :style="{ top: block.top, height: block.height, backgroundColor: block.color }"
              ></view>
            </view>
            <text class="time-label">24</text>
          </view>

          <!-- 中间 CSS 环形图 -->
          <view class="pie-chart-wrap">
            <view class="pie-chart-container">
              <view class="css-ring-chart" :style="{ background: pieConicGradient }">
                <view class="inner-circle">
                  <text class="ring-total-time">{{ totalTimeTrackerStr }}</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 右侧最近记录 -->
          <view class="recent-records">
            <view
              class="recent-item"
              v-for="record in recentTimeRecords"
              :key="record.id"
              :style="{ color: getCategoryColor(record.categoryId) }"
            >
              <text class="record-time-str">{{ formatRecordTimeStr(record) }}</text>
              <text class="record-cat">{{ getCategoryName(record.categoryId) }}</text>
            </view>
          </view>
        </template>
        <view v-else class="empty-time-tracker">
          <text>今日暂无记录</text>
        </view>
      </view>
    </view>

    <!-- 快捷导航 -->
    <view class="panel" v-if="quickNavs.length > 0">
      <view class="panel-header">
        <text class="panel-title">快捷导航</text>
      </view>
      <view class="panel-body quick-nav-grid">
        <view class="nav-item" v-for="nav in quickNavs" :key="nav.id || nav.menuId" @click="navigateTo(nav.path || nav.url)">
          <view class="nav-icon-wrap" :style="{ color: nav.color || '#007aff' }">
            <view class="iconify-icon" :style="getIconifyStyle(nav.icon)"></view>
          </view>
          <text class="nav-text">{{ nav.title }}</text>
        </view>
      </view>
    </view>

    <view class="panel" v-else-if="loading">
      <view class="panel-header">
        <view class="skeleton-text" style="width: 160rpx; height: 30rpx;"></view>
      </view>
      <view class="panel-body quick-nav-grid">
        <view class="nav-item" v-for="i in 4" :key="i">
          <view class="skeleton-block" style="width: 80rpx; height: 80rpx; border-radius: 24rpx; margin-bottom: 12rpx;"></view>
          <view class="skeleton-text" style="width: 60rpx; height: 24rpx;"></view>
        </view>
      </view>
    </view>

    <!-- 待办任务 -->
    <view class="panel" v-if="watchedTasks.length > 0">
      <view class="panel-header" @click="navigateTo('/pages/task-center/todo/index')">
        <text class="panel-title">待办</text>
        <view class="header-actions">
          <uni-icons type="loop" size="18" color="#999" @click.stop="refreshTasks"></uni-icons>
          <uni-icons type="right" size="16" color="#999"></uni-icons>
        </view>
      </view>
      <view class="panel-body">
        <view
          class="task-item"
          v-for="task in watchedTasks"
          :key="task.id"
          @click="navigateTo('/pages/task-center/todo/index')"
        >
          <view class="checkbox" :class="{ 'is-checked': task.isCompleted }">
            <uni-icons v-if="task.isCompleted" type="checkmarkempty" size="14" color="#fff"></uni-icons>
          </view>
          <view class="task-content">
            <view class="task-title-wrap">
              <text class="task-priority" v-if="task.priority" :class="'p-' + task.priority">
                {{ task.priority === 1 ? '高' : task.priority === 10 ? '中' : '低' }}
              </text>
              <text class="task-title" :class="{ 'completed': task.isCompleted }">{{ task.content }}</text>
            </view>
            <view class="task-meta" v-if="task.taskName || task.startTime">
              <text class="task-tag" v-if="task.taskName">{{ task.taskName }}</text>
              <text class="task-time" v-if="task.startTime || task.endTime">
                {{ formatTimeRangeStr(task.startTime, task.endTime) }}
              </text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="panel" v-else-if="loading">
      <view class="panel-header">
        <view class="skeleton-text" style="width: 120rpx; height: 30rpx;"></view>
      </view>
      <view class="panel-body">
        <view class="task-item" v-for="i in 3" :key="i" style="margin-bottom: 24rpx;">
          <view class="skeleton-block" style="width: 32rpx; height: 32rpx; margin-right: 20rpx;"></view>
          <view style="flex: 1;">
            <view class="skeleton-text" style="width: 80%; height: 28rpx; margin-bottom: 12rpx;"></view>
            <view class="skeleton-text" style="width: 40%; height: 22rpx;"></view>
          </view>
        </view>
      </view>
    </view>

    <!-- 固定闪念 -->
    <view class="panel">
      <view class="panel-header" @click="refreshPinnedThoughts">
        <text class="panel-title" @click.stop="navigateTo('/pages/record/think/index')">固定闪念</text>
        <view class="header-add-btn" @click.stop="navigateTo('/pages/record/think/index')">+</view>
      </view>
      <view class="panel-body">
        <view v-if="pinnedThoughts.length > 0">
          <view class="thought-item" v-for="thought in pinnedThoughts" :key="thought.id">
            <uni-icons type="star-filled" size="18" color="#f5a623" class="thought-icon"></uni-icons>
            <view class="thought-content">
              <text class="thought-text">{{ thought.content }}</text>
              <text class="thought-time">{{ formatThoughtTime(thought.createTime) }}</text>
            </view>
          </view>
        </view>
        <view v-else class="empty-time-tracker">
          <text>暂无固定闪念</text>
        </view>
      </view>
    </view>

    <!-- 运动概览 -->
    <view class="panel" v-if="exerciseSummary">
      <view class="panel-header" @click="navigateTo('/pages/record/exercise/index')">
        <text class="panel-title">运动</text>
        <view class="header-actions">
          <uni-icons type="loop" size="18" color="#999" @click.stop="refreshExercise"></uni-icons>
          <uni-icons type="right" size="16" color="#999"></uni-icons>
        </view>
      </view>
      <view class="panel-body exercise-grid">
        <view class="ex-stat">
          <text class="ex-value">{{ exerciseSummary.totalTimes || 0 }}</text>
          <text class="ex-label">累计运动次数</text>
        </view>
        <view class="ex-divider"></view>
        <view class="ex-stat">
          <text class="ex-value">{{ exerciseSummary.totalDuration || 0 }}</text>
          <text class="ex-label">累计时长(分钟)</text>
        </view>
      </view>
    </view>

    <!-- GitHub 最近提交 -->
    <view class="panel" v-if="githubCommits.length > 0">
      <view class="panel-header">
        <text class="panel-title">最近提交</text>
      </view>
      <view class="panel-body">
        <view class="commit-item" v-for="commit in githubCommits" :key="commit.id">
          <text class="commit-msg">{{ commit.message }}</text>
          <text class="commit-meta">{{ commit.repo }} · {{ formatDate(commit.date) }}</text>
        </view>
      </view>
    </view>

    <view style="height: 40rpx;"></view>
  </scroll-view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app';
import {
  getDashboardTasks,
  getDashboardCardDetail,
  getWatchedTaskDetails,
  getMyQuickNavApi,
  getPinnedThoughts,
  queryTimeTracker,
  getRecentCommitsApi,
  getDashboardSummaryApi
} from '../../api/dashboard';
import { listCategories } from '../../api/time-tracker-category';
import type {
  DashboardCard,
  WatchedTaskDetail,
  QuickNavItem,
  ThoughtItem,
  GithubCommitVO,
  ExerciseDashboardSummaryVO
} from '../../api/dashboard';
import type { TimeTrackerCategoryEntity } from '../../api/time-tracker-category';
import { useUserStore } from '../../store/user';

const userStore = useUserStore();
const cardDetails = ref<DashboardCard[]>([]);
const watchedTasks = ref<WatchedTaskDetail[]>([]);
const quickNavs = ref<QuickNavItem[]>([]);
const pinnedThoughts = ref<ThoughtItem[]>([]);
const githubCommits = ref<GithubCommitVO[]>([]);
const exerciseSummary = ref<ExerciseDashboardSummaryVO | null>(null);
const timeRecords = ref<any[]>([]);
const categories = ref<TimeTrackerCategoryEntity[]>([]);

const loading = ref(false);
const isRefreshing = ref(false);

const navigateTo = (url?: string) => {
  if (!url) return;

  const token = userStore.token;
  if (!token && url !== '/pages/login/index') {
    uni.navigateTo({ url: '/pages/login/index' });
    return;
  }

  // Define tab bar pages
  const tabs = [
    '/pages/task-center/todo/index',
    '/pages/dashboard/index',
    '/pages/message/index',
    '/pages/_core/profile/index'
  ];

  let targetUrl = url;

  // Transform web route to mobile route if it doesn't start with /pages/
  if (!targetUrl.startsWith('/pages/')) {
    if (!targetUrl.startsWith('/')) {
      targetUrl = '/' + targetUrl;
    }

    if (targetUrl === '/analytics' || targetUrl === '/dashboard') {
      targetUrl = '/pages/dashboard/index'; // Already at home basically
    } else if (targetUrl === '/profile') {
      targetUrl = '/pages/_core/profile/index';
    } else if (targetUrl.startsWith('/my-hub/')) {
      targetUrl = `/pages/goods/${targetUrl.replace('/my-hub/', '')}/index`;
    } else {
      // General mapping rule: /foo/bar -> /pages/foo/bar/index
      targetUrl = `/pages${targetUrl}/index`;
    }
  }

  // Prevent navigating to the exact current page again if it's the dashboard itself
  if (targetUrl === '/pages/dashboard/index') return;

  if (tabs.includes(targetUrl)) {
    uni.switchTab({ url: targetUrl });
  } else {
    uni.navigateTo({
      url: targetUrl,
      fail: (err) => {
        console.error('Navigate failed:', err, 'Target URL:', targetUrl);
        uni.showToast({ title: '尚未开发: ' + targetUrl.replace('/pages/', '').replace('/index', ''), icon: 'none' });
      }
    });
  }
};

const handleCardClick = (url?: string) => {
  if (!url) return;
  if (url.startsWith('action:')) {
    if (url === 'action:open-time-tracker-modal') {
      navigateTo('/pages/subPages/timeTracker/index');
    } else if (url === 'action:open-exercise-modal') {
      navigateTo('/pages/subPages/exercise/index');
    } else {
      uni.showToast({ title: '该功能移动端开发中', icon: 'none' });
    }
    return;
  }
  navigateTo(url);
};

// ---------------- 时迹 CSS Timeline 计算 ----------------
const timelineBlocks = computed(() => {
  const totalMinutes = 24 * 60;
  return timeRecords.value.map(record => {
    const startMin = Number(record.startTime) || 0;
    const endMin = Number(record.endTime) || 0;

    let durationMin = record.duration;
    if (durationMin == null || durationMin === 0) {
      durationMin = endMin - startMin;
    }
    durationMin = Number(durationMin) || 0;
    if (durationMin < 0) durationMin = 0;

    const startPercent = (startMin / totalMinutes) * 100;
    let heightPercent = (durationMin / totalMinutes) * 100;
    if (heightPercent < 1 && durationMin > 0) heightPercent = 1; // 最小高度 1%

    const cat = categories.value.find(c => c.id === record.categoryId);
    return {
      id: record.id,
      top: `${startPercent}%`,
      height: `${heightPercent}%`,
      color: cat?.color || '#007aff'
    };
  });
});

const totalTimeTrackerStr = computed(() => {
  let totalMins = 0;
  timeRecords.value.forEach(record => {
    let d = record.duration;
    if (d == null || d === 0) {
      d = (Number(record.endTime) || 0) - (Number(record.startTime) || 0);
    }
    d = Number(d) || 0;
    if (d > 0) {
      totalMins += d;
    }
  });
  return formatDurationFromMins(totalMins);
});

const recentTimeRecords = computed(() => {
  // 取最近5条，基于 startTime 倒序
  const sorted = [...timeRecords.value].sort((a, b) => (Number(b.startTime) || 0) - (Number(a.startTime) || 0));
  return sorted.slice(0, 5);
});

const pieConicGradient = computed(() => {
  if (timeRecords.value.length === 0) return 'conic-gradient(#ccc 0% 100%)';

  const categoryDurations: Record<string, number> = {};
  timeRecords.value.forEach(record => {
    let d = record.duration;
    if (d == null || d === 0) {
      d = (Number(record.endTime) || 0) - (Number(record.startTime) || 0);
    }
    d = Number(d) || 0;
    if (d > 0) {
      categoryDurations[record.categoryId] = (categoryDurations[record.categoryId] || 0) + d;
    }
  });

  const total = Object.values(categoryDurations).reduce((sum, val) => sum + val, 0);
  if (total <= 0) return 'conic-gradient(#ccc 0% 100%)';

  let currentPercent = 0;
  const gradientParts: string[] = [];

  Object.entries(categoryDurations).forEach(([catId, duration]) => {
    if (duration <= 0) return;
    const cat = categories.value.find(c => c.id === catId);
    const color = cat?.color || '#007aff';
    const percent = (duration / total) * 100;
    gradientParts.push(`${color} ${currentPercent}% ${currentPercent + percent}%`);
    currentPercent += percent;
  });

  return `conic-gradient(${gradientParts.join(', ')})`;
});

const getCategoryColor = (id: string) => {
  const cat = categories.value.find(c => c.id === id);
  return cat?.color || '#007aff';
};

const getCategoryName = (id: string) => {
  const cat = categories.value.find(c => c.id === id);
  return cat?.name || '未知';
};

const formatTimeRange = (start: number, end: number) => {
  const format = (t: number) => {
    const d = new Date(t);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };
  return `${format(start)}-${format(end)}`;
};

const formatDurationFromMins = (mins: number) => {
  if (!mins || isNaN(mins)) return '0m';
  const m = Math.floor(mins);
  const h = Math.floor(m / 60);
  const remMins = m % 60;
  if (h > 0 && remMins > 0) return `${h}h${remMins}m`;
  if (h > 0) return `${h}h`;
  return `${remMins}m`;
};

const formatRecordTimeStr = (record: any) => {
  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  };
  let d = record.duration;
  if (d == null || d === 0) {
    d = (Number(record.endTime) || 0) - (Number(record.startTime) || 0);
  }
  d = Number(d) || 0;
  if (d < 0) d = 0;

  const h = Math.floor(d / 60);
  const mins = d % 60;
  let durStr = '';
  if (h > 0 && mins > 0) durStr = `${h}h${mins}m`;
  else if (h > 0) durStr = `${h}h`;
  else durStr = `${mins}m`;

  return `${formatTime(Number(record.startTime) || 0)} ${durStr}`;
};

// ---------------- 辅助格式化 ----------------
const formatTimeRangeStr = (start?: string, end?: string) => {
  if (!start && !end) return '';
  const f = (s?: string) => {
    if (!s) return '';
    const d = new Date(s);
    return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };
  if (start && end) return `${f(start)} - ${f(end)}`;
  return f(start) || f(end);
};

const formatThoughtTime = (dateStr?: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}-${d.getDate()}`;
};

const getIconifyStyle = (iconStr: string, keepColor = false) => {
  if (!iconStr) return '';
  const [collection, name] = iconStr.split(':');
  if (!collection || !name) return '';
  const url = `url("https://api.iconify.design/${collection}/${name}.svg")`;

  if (keepColor) {
    return {
      background: `${url} no-repeat center / contain`
    };
  }

  return {
    mask: `${url} no-repeat center / contain`,
    '-webkit-mask': `${url} no-repeat center / contain`,
    backgroundColor: 'currentColor'
  };
};

// ---------------- 单独刷新方法 ----------------
const refreshTimeTracker = async () => {
  uni.showLoading({ title: '刷新中...', mask: true });
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  try {
    const catsRes = await listCategories();
    categories.value = catsRes || [];
    const resVal = await queryTimeTracker(today);
    if (resVal && Array.isArray(resVal.items)) timeRecords.value = resVal.items;
    else if (resVal && Array.isArray(resVal.data)) timeRecords.value = resVal.data;
    else if (resVal && Array.isArray(resVal.records)) timeRecords.value = resVal.records;
    else if (Array.isArray(resVal)) timeRecords.value = resVal;
    else timeRecords.value = [];
  } catch (err) {
    console.error('refreshTimeTracker error:', err);
  } finally {
    uni.hideLoading();
  }
};

const refreshTasks = async () => {
  uni.showLoading({ title: '刷新中...', mask: true });
  try {
    const res = await getWatchedTaskDetails();
    watchedTasks.value = res || [];
  } catch (err) {
    console.error('refreshTasks error:', err);
  } finally {
    uni.hideLoading();
  }
};

const refreshExercise = async () => {
  uni.showLoading({ title: '刷新中...', mask: true });
  try {
    const res = await getDashboardSummaryApi();
    exerciseSummary.value = res || { totalTimes: 0, totalDuration: 0, recentRecords: [] };
  } catch (err) {
    console.error('refreshExercise error:', err);
  } finally {
    uni.hideLoading();
  }
};

const refreshPinnedThoughts = async () => {
  uni.showLoading({ title: '刷新中...', mask: true });
  try {
    const res = await getPinnedThoughts();
    pinnedThoughts.value = res || [];
  } catch (err) {
    console.error('refreshPinnedThoughts error:', err);
  } finally {
    uni.hideLoading();
  }
};

// ---------------- 数据加载 ----------------
const fetchData = () => {
  if (!userStore.token) return;
  loading.value = true;

  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  const p1 = listCategories().then(catsRes => {
    categories.value = catsRes || [];
    return queryTimeTracker(today).then(resVal => {
      console.log('queryTimeTracker response:', resVal);
      if (resVal && Array.isArray(resVal.items)) timeRecords.value = resVal.items;
      else if (resVal && Array.isArray(resVal.data)) timeRecords.value = resVal.data;
      else if (resVal && Array.isArray(resVal.records)) timeRecords.value = resVal.records;
      else if (Array.isArray(resVal)) timeRecords.value = resVal;
      else timeRecords.value = [];
    });
  }).catch(err => console.error('TimeTracker error:', err));

  const p2 = getDashboardTasks().then(async tasks => {
    if (tasks && tasks.length > 0) {
      const detailsPromises = tasks.map(t => getDashboardCardDetail(t.type));
      const details = await Promise.all(detailsPromises);
      cardDetails.value = details.filter(Boolean);
    }
  }).catch(err => console.error('DashboardTasks error:', err));

  const p3 = getWatchedTaskDetails().then(res => watchedTasks.value = res || []).catch(err => console.error('WatchedTasks error:', err));
  const p4 = getMyQuickNavApi().then(res => quickNavs.value = res || []).catch(err => console.error('QuickNav error:', err));
  const p5 = getPinnedThoughts().then(res => pinnedThoughts.value = res || []).catch(err => console.error('PinnedThoughts error:', err));
  const p6 = getRecentCommitsApi(5).then(res => githubCommits.value = res || []).catch(err => console.error('Commits error:', err));
  const p7 = getDashboardSummaryApi().then(res => {
    exerciseSummary.value = res || { totalTimes: 0, totalDuration: 0, recentRecords: [] };
  }).catch(err => console.error('Exercise error:', err));

  Promise.allSettled([p1, p2, p3, p4, p5, p6, p7]).finally(() => {
    loading.value = false;
    isRefreshing.value = false;
    uni.stopPullDownRefresh();
  });
};

const onRefresh = () => {
  isRefreshing.value = true;
  fetchData();
};

onShow(() => {
  if (!userStore.token) {
    uni.reLaunch({ url: '/pages/login/index' });
    return;
  }
  fetchData();
});

onPullDownRefresh(() => {
  fetchData();
});
const onPullDownRefreshHandler = () => {
  fetchData();
};

onPullDownRefresh(() => {
  onPullDownRefreshHandler();
});
</script>

<style lang="scss" scoped>
.container {
  height: 100vh;
  background-color: #f5f6f8;
  display: flex;
  flex-direction: column;
}

.scroll-area {
  flex: 1;
  padding: 24rpx;
  box-sizing: border-box;
}

/* 骨架屏样式 */
.skeleton-text {
  background: #e2e4e8;
  border-radius: 8rpx;
  animation: skeleton-blink 1.5s ease-in-out infinite;
}
.skeleton-text.short { width: 40%; height: 24rpx; margin-bottom: 16rpx; }
.skeleton-text.title { width: 80%; height: 36rpx; margin-bottom: 16rpx; }
.skeleton-text.bottom { width: 60%; height: 20rpx; }

.skeleton-block {
  background: #e2e4e8;
  border-radius: 16rpx;
  animation: skeleton-blink 1.5s ease-in-out infinite;
}

@keyframes skeleton-blink {
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
}

/* 顶部数据卡片 */
.overview-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16rpx;

  .header-right {
    padding: 8rpx;
    display: flex;
    align-items: center;
    gap: 16rpx;
  }
}

.overview-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  margin-bottom: 20rpx;

  .overview-card {
    width: 48%;
    background-color: #fff;
    border-radius: 12rpx;
    padding: 16rpx 20rpx;
    margin-bottom: 16rpx;
    box-sizing: border-box;
    box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
    min-height: 140rpx;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    border: 1rpx solid #f0f0f0;

    .card-top {
      margin-bottom: 8rpx;

      .card-title {
        font-size: 24rpx;
        color: #333;
        font-weight: 500;
      }
    }

    .card-middle {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12rpx;

      .card-value {
        font-size: 32rpx;
        font-weight: bold;
      }

      .card-icon {
        width: 40rpx;
        height: 40rpx;
      }
    }

    .card-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      .card-total {
        font-size: 20rpx;
        color: #999;
      }
      .card-total-value {
        font-size: 20rpx;
        color: #666;
      }
    }
  }
}

/* 通用面板容器 */
.panel {
  background-color: #fff;
  border-radius: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.03);
  overflow: hidden;

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24rpx 32rpx;
    border-bottom: 1rpx solid #f9f9f9;

    .panel-title {
      font-size: 30rpx;
      font-weight: 600;
      color: #333;
    }

    .header-add-btn {
      width: 48rpx;
      height: 48rpx;
      border-radius: 50%;
      border: 2rpx dashed #bbb;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36rpx;
      color: #aaa;
      line-height: 1;
    }
  }

  .panel-body {
    padding: 24rpx 32rpx;
  }
}

/* 时迹 CSS Timeline */
.time-tracker-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 280rpx;
  padding: 16rpx 0;

  .timeline-24h {
    width: 40rpx;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;

    .time-label {
      font-size: 20rpx;
      color: #aaa;
      line-height: 1;
    }

    .timeline-track {
      flex: 1;
      width: 8rpx;
      background-color: #f0f0f0;
      border-radius: 8rpx;
      margin: 8rpx 0;
      position: relative;
      overflow: hidden;
      height: 100%;

      .timeline-block {
        position: absolute;
        left: 0;
        right: 0;
        width: 100%;
        border-radius: 4rpx;
        min-height: 4rpx;
      }
    }
  }

  .pie-chart-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;

    .pie-chart-container {
      width: 100%;
      display: flex;
      justify-content: center;
    }

    .css-ring-chart {
      width: 200rpx;
      height: 200rpx;
      border-radius: 50%;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;

      .inner-circle {
        width: 140rpx;
        height: 140rpx;
        background-color: #fff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: inset 0 2rpx 8rpx rgba(0,0,0,0.02);

        .ring-total-time {
          font-size: 26rpx;
          color: #333;
          font-weight: bold;
          line-height: 1;
        }
      }
    }
  }

  .recent-records {
    width: 240rpx;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-end;
    gap: 24rpx;

    .recent-item {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12rpx;
      font-family: monospace;
      font-size: 22rpx;
      opacity: 0.85;
      line-height: 1;

      .record-time-str {
        flex-shrink: 0;
      }

      .record-cat {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 120rpx;
      }
    }
  }
}

.empty-time-tracker {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
  font-size: 26rpx;
}

/* 快捷导航 */
.quick-nav-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 32rpx 0;

  .nav-item {
    width: 25%;
    display: flex;
    flex-direction: column;
    align-items: center;

    .nav-icon-wrap {
      width: 80rpx;
      height: 80rpx;
      background-color: #f4f8ff;
      border-radius: 24rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12rpx;

      .iconify-icon {
        width: 44rpx;
        height: 44rpx;
      }
    }

    .nav-text {
      font-size: 24rpx;
      color: #333;
    }
  }
}

/* 待办列表 */
.task-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 24rpx;

  &:last-child {
    margin-bottom: 0;
  }

  .checkbox {
    width: 32rpx;
    height: 32rpx;
    border-radius: 8rpx;
    border: 2rpx solid #ddd;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 20rpx;
    margin-top: 4rpx;
    transition: all 0.2s;

    &.is-checked {
      background-color: #4cd964;
      border-color: #4cd964;
    }
  }

  .task-content {
    flex: 1;
    min-width: 0;

    .task-title-wrap {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 8rpx;

      .task-priority {
        font-size: 20rpx;
        color: #fff;
        padding: 2rpx 8rpx;
        border-radius: 6rpx;
        margin-right: 12rpx;
        &.p-1 { background-color: #ff3b30; }
        &.p-10 { background-color: #ff9500; }
        &.p-99 { background-color: #8e8e93; }
      }

      .task-title {
        font-size: 28rpx;
        color: #333;
        line-height: 1.4;

        &.completed {
          text-decoration: line-through;
          color: #999;
        }
      }
    }

    .task-meta {
      display: flex;
      align-items: center;
      gap: 16rpx;

      .task-tag {
        font-size: 20rpx;
        background-color: #f0f0f0;
        color: #666;
        padding: 4rpx 12rpx;
        border-radius: 6rpx;
      }

      .task-time {
        font-size: 22rpx;
        color: #999;
      }
    }
  }
}

/* 闪念列表 */
.thought-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 24rpx;
  background-color: #fafafa;
  padding: 20rpx;
  border-radius: 16rpx;

  &:last-child {
    margin-bottom: 0;
  }

  .thought-icon {
    margin-right: 16rpx;
    margin-top: 4rpx;
  }

  .thought-content {
    flex: 1;

    .thought-text {
      font-size: 26rpx;
      color: #333;
      line-height: 1.5;
      display: block;
      margin-bottom: 12rpx;
    }

    .thought-time {
      font-size: 22rpx;
      color: #999;
    }
  }
}

/* 运动概览 */
.exercise-grid {
  display: flex;
  align-items: center;
  justify-content: center;

  .ex-stat {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;

    .ex-value {
      font-size: 48rpx;
      font-weight: bold;
      color: #333;
      margin-bottom: 8rpx;
    }
    .ex-label {
      font-size: 24rpx;
      color: #999;
    }
  }

  .ex-divider {
    width: 2rpx;
    height: 60rpx;
    background-color: #eee;
  }
}

/* GitHub 提交 */
.commit-item {
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
  &:first-child {
    padding-top: 0;
  }

  .commit-msg {
    font-size: 28rpx;
    color: #333;
    display: block;
    margin-bottom: 8rpx;
    font-family: monospace;
  }

  .commit-meta {
    font-size: 22rpx;
    color: #999;
  }
}
</style>
