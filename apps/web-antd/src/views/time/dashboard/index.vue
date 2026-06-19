<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { LeftOutlined, RightOutlined } from '@ant-design/icons-vue';
import { Button, Radio, Spin, theme } from 'ant-design-vue';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

import { query, queryByDateRange } from '#/api/core/time-tracker';
import { listCategories } from '#/api/core/time-tracker-category';

import AnalysisCard from '../../dashboard/home/components/analysis-card.vue';
import CategoryFilter from '../time-tracker/components/CategoryFilter.vue';
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
    <div
      class="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
    >
      <div class="flex flex-wrap items-center gap-3">
        <h2 class="m-0 whitespace-nowrap text-xl font-bold">时迹看板</h2>
        <Radio.Group
          v-model:value="statMode"
          @change="loadData"
          :disabled="loading"
          class="flex-shrink-0"
        >
          <Radio.Button value="day">日</Radio.Button>
          <Radio.Button value="week">周</Radio.Button>
          <Radio.Button value="month">月</Radio.Button>
        </Radio.Group>
        <div class="flex-shrink-0">
          <CategoryFilter
            :categories="categories"
            :loading="loading"
            multiple
            @filter-change="handleFilterChange"
          />
        </div>
      </div>
      <div
        class="flex items-center justify-center rounded-md bg-gray-100 p-1 md:justify-end dark:bg-gray-800"
      >
        <Button
          @click="goToPreviousPeriod"
          :disabled="loading"
          type="text"
          size="small"
        >
          <template #icon><LeftOutlined /></template>
        </Button>
        <span class="px-2 text-center font-medium sm:min-w-[120px]">
          {{ dateDisplay }}
        </span>
        <Button
          @click="goToNextPeriod"
          :disabled="loading"
          type="text"
          size="small"
        >
          <template #icon><RightOutlined /></template>
        </Button>
      </div>
    </div>

    <Spin :spinning="loading">
      <!-- 摘要统计卡片 -->
      <div
        class="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
      >
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
    </Spin>
  </div>
</template>

<style scoped>
.shadow-sm {
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 5%);
}
</style>
