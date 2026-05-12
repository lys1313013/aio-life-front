<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { LeftOutlined, RightOutlined } from '@ant-design/icons-vue';
import { Button, Card, Empty, Radio, Spin, theme } from 'ant-design-vue';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

import { query, queryByDateRange } from '#/api/core/time-tracker';
import { listCategories } from '#/api/core/time-tracker-category';

import AnalysisCard from '../../dashboard/home/components/analysis-card.vue';
import CategoryFilter from '../time-tracker/components/CategoryFilter.vue';
import DailyCategoryBarChart from '../time-tracker/components/DailyCategoryBarChart.vue';
import TimeCategoryBarChart from '../time-tracker/components/TimeCategoryBarChart.vue';
import TimeCategoryPieChart from '../time-tracker/components/TimeCategoryPieChart.vue';
import TimeCategoryStackedAreaChart from '../time-tracker/components/TimeCategoryStackedAreaChart.vue';
import TimeTypePieChart from '../time-tracker/components/TimeTypePieChart.vue';
import { defaultConfig } from '../time-tracker/config';
import { formatDuration } from '../time-tracker/utils';

dayjs.extend(isoWeek);

const loading = ref(false);
const statMode = ref<'day' | 'month' | 'week'>('week');
const selectedDate = ref(dayjs());
const selectedFilterCategoryIds = ref<string[]>([]);
const timeSlots = ref<any[]>([]);
const previousPeriodTimeSlots = ref<any[]>([]);
const categories = ref(defaultConfig.categories);

const { useToken } = theme;
const { token } = useToken();

const barChartTitle = computed(() => {
  if (statMode.value !== 'day' && selectedFilterCategoryIds.value.length > 0) {
    return '分类分布 (按天)';
  }
  return '分类分布';
});

const dateDisplay = computed(() => {
  if (statMode.value === 'day') {
    return selectedDate.value.format('YYYY-MM-DD');
  } else if (statMode.value === 'week') {
    const start = selectedDate.value.startOf('isoWeek').format('MM-DD');
    const end = selectedDate.value.endOf('isoWeek').format('MM-DD');
    return `${selectedDate.value.year()}年第${selectedDate.value.isoWeek()}周 (${start} ~ ${end})`;
  } else {
    return selectedDate.value.format('YYYY年MM月');
  }
});

const trackedCards = computed(() => {
  return categories.value
    .filter((cat) => cat.isTrackTime)
    .map((cat) => {
      const duration = timeSlots.value
        .filter((slot) => slot.categoryId === cat.id)
        .reduce(
          (total, slot) =>
            total + (slot.duration || slot.endTime - slot.startTime + 1),
          0,
        );

      const prevDuration = previousPeriodTimeSlots.value
        .filter((slot) => slot.categoryId === cat.id)
        .reduce(
          (total, slot) =>
            total + (slot.duration || slot.endTime - slot.startTime + 1),
          0,
        );

      const diff = duration - prevDuration;
      const absDiff = Math.abs(diff);

      return {
        id: cat.id,
        name: cat.name,
        duration: formatDuration(duration),
        diffValue:
          diff === 0
            ? '-'
            : `${diff > 0 ? '↑' : '↓'} ${formatDuration(absDiff)}`,
        diffColor:
          diff === 0
            ? '#8c8c8c'
            : diff > 0
              ? token.value.colorError
              : token.value.colorSuccess,
      };
    });
});

const handleFilterChange = (categoryIds: null | string[]) => {
  selectedFilterCategoryIds.value = categoryIds || [];
};

const loadCategories = async () => {
  try {
    const data = await listCategories();
    if (data) {
      categories.value = data.map((cat) => {
        const isPublic = Number(cat.userId) === 0;
        const isOverride = !!cat.templateId;
        return {
          id: cat.id || '',
          name: cat.name,
          color: cat.color,
          description: cat.description || '',
          isTrackTime: !!cat.isTrackTime,
          timeType: cat.timeType as 1 | 2 | 3 | undefined,
          categoryType: isPublic ? 'public' : isOverride ? 'public' : 'private',
          isOverridden: isOverride,
        };
      }) as any;
    }
  } catch (error) {
    console.error('加载分类配置失败:', error);
  }
};

const loadData = async () => {
  loading.value = true;
  try {
    const promises: Promise<any>[] = [];

    // 1. Current Period
    if (statMode.value === 'day') {
      promises.push(
        query({ condition: { date: selectedDate.value.format('YYYY-MM-DD') } }),
      );
    } else {
      const start = selectedDate.value
        .startOf(statMode.value === 'week' ? 'isoWeek' : 'month')
        .format('YYYY-MM-DD');
      const end = selectedDate.value
        .endOf(statMode.value === 'week' ? 'isoWeek' : 'month')
        .format('YYYY-MM-DD');
      promises.push(
        queryByDateRange({ condition: { startDate: start, endDate: end } }),
      );
    }

    // 2. Previous Period
    if (statMode.value === 'day') {
      const prevDate = selectedDate.value
        .subtract(1, 'day')
        .format('YYYY-MM-DD');
      promises.push(query({ condition: { date: prevDate } }));
    } else {
      const prevPeriod = selectedDate.value.subtract(
        1,
        statMode.value === 'week' ? 'week' : 'month',
      );
      const start = prevPeriod
        .startOf(statMode.value === 'week' ? 'isoWeek' : 'month')
        .format('YYYY-MM-DD');
      const end = prevPeriod
        .endOf(statMode.value === 'week' ? 'isoWeek' : 'month')
        .format('YYYY-MM-DD');
      promises.push(
        queryByDateRange({ condition: { startDate: start, endDate: end } }),
      );
    }

    const [res, prevRes] = await Promise.all(promises);

    // Process Current Period
    if (Array.isArray(res)) {
      timeSlots.value = res;
    } else if (res && (res as any).items) {
      timeSlots.value = (res as any).items;
    } else {
      timeSlots.value = [];
    }

    // Process Previous Period
    if (Array.isArray(prevRes)) {
      previousPeriodTimeSlots.value = prevRes;
    } else if (prevRes && (prevRes as any).items) {
      previousPeriodTimeSlots.value = (prevRes as any).items;
    } else {
      previousPeriodTimeSlots.value = [];
    }
  } catch (error) {
    console.error('加载看板数据失败:', error);
  } finally {
    loading.value = false;
  }
};

const goToPreviousPeriod = () => {
  selectedDate.value = selectedDate.value.subtract(1, statMode.value as any);
  loadData();
};

const goToNextPeriod = () => {
  selectedDate.value = selectedDate.value.add(1, statMode.value as any);
  loadData();
};

onMounted(async () => {
  await loadCategories();
  loadData();
});
</script>

<template>
  <div class="p-4">
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <h2 class="text-xl font-bold">时迹看板</h2>
        <Radio.Group
          v-model:value="statMode"
          @change="loadData"
          :disabled="loading"
        >
          <Radio.Button value="day">日</Radio.Button>
          <Radio.Button value="week">周</Radio.Button>
          <Radio.Button value="month">月</Radio.Button>
        </Radio.Group>
        <CategoryFilter
          :categories="categories"
          :loading="loading"
          multiple
          @filter-change="handleFilterChange"
        />
      </div>
      <div class="flex items-center gap-2">
        <Button @click="goToPreviousPeriod" :disabled="loading">
          <template #icon><LeftOutlined /></template>
        </Button>
        <span class="min-w-[120px] text-center font-medium">
          {{ dateDisplay }}
        </span>
        <Button @click="goToNextPeriod" :disabled="loading">
          <template #icon><RightOutlined /></template>
        </Button>
      </div>
    </div>

    <Spin :spinning="loading">
      <!-- 摘要统计卡片 -->
      <div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AnalysisCard
          v-for="card in trackedCards"
          :key="card.id"
          :title="card.name"
          :value="card.duration"
          :diff-value="card.diffValue"
          :diff-color="card.diffColor"
          :loading="loading"
        />
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <!-- 分类概览 -->
        <Card
          title="分类分布"
          :bordered="false"
          class="overflow-hidden shadow-sm"
          :body-style="{ padding: '12px' }"
        >
          <div class="h-[280px]">
            <TimeCategoryPieChart
              v-if="timeSlots.length > 0"
              :time-slots="timeSlots"
              :categories="categories"
              :selected-date="selectedDate"
              :selected-filter-category-ids="selectedFilterCategoryIds"
            />
            <Empty v-else description="暂无数据" class="mt-10" />
          </div>
        </Card>

        <!-- 类型概览 -->
        <TimeTypePieChart
          v-if="timeSlots.length > 0"
          :time-slots="timeSlots"
          :categories="categories"
          :selected-date="selectedDate"
          :selected-filter-category-ids="selectedFilterCategoryIds"
          :bordered="false"
        />
        <Card
          v-else
          title="类型统计"
          :bordered="false"
          class="overflow-hidden shadow-sm"
          :body-style="{ padding: '12px' }"
        >
          <Empty description="暂无数据" class="mt-10" />
        </Card>

        <!-- 详细统计 -->
        <Card
          :title="barChartTitle"
          :bordered="false"
          class="overflow-hidden shadow-sm"
          :body-style="{ padding: '12px' }"
        >
          <div class="h-[280px]">
            <template v-if="timeSlots.length > 0">
              <DailyCategoryBarChart
                v-if="
                  statMode !== 'day' && selectedFilterCategoryIds.length > 0
                "
                :time-slots="timeSlots"
                :categories="categories"
                :selected-date="selectedDate"
                :stat-mode="statMode"
                :selected-filter-category-ids="selectedFilterCategoryIds"
              />
              <TimeCategoryBarChart
                v-else
                :time-slots="timeSlots"
                :categories="categories"
                :selected-date="selectedDate"
                :selected-filter-category-ids="selectedFilterCategoryIds"
              />
            </template>
            <Empty v-else description="暂无数据" class="mt-20" />
          </div>
        </Card>

        <!-- 趋势分析 (周/月) -->
        <Card
          v-if="statMode !== 'day'"
          title="时间趋势"
          :bordered="false"
          class="shadow-sm lg:col-span-3"
          :body-style="{ paddingBottom: '12px' }"
        >
          <div class="h-[320px]">
            <TimeCategoryStackedAreaChart
              v-if="timeSlots.length > 0"
              :time-slots="timeSlots"
              :categories="categories"
              :selected-date="selectedDate"
              :stat-mode="statMode"
              :selected-filter-category-ids="selectedFilterCategoryIds"
            />
            <Empty v-else description="暂无数据" class="mt-20" />
          </div>
        </Card>
      </div>
    </Spin>
  </div>
</template>

<style scoped>
.shadow-sm {
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 5%);
}
</style>
