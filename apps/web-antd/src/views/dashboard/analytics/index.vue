<script lang="ts" setup>
import type { AnalysisOverviewItem } from '@vben/common-ui';
import type { TabOption } from '@vben/types';

import { onMounted, ref } from 'vue';

import {
  AnalysisChartCard,
  AnalysisChartsTabs,
  AnalysisOverview,
} from '@vben/common-ui';
import {
  SvgBellIcon,
  SvgCakeIcon,
  SvgCardIcon,
  SvgDownloadIcon,
} from '@vben/icons';

import { getDashboardCard } from '#/api/core/dashboard';

import AnalyticsTrends from './analytics-trends.vue';
import AnalyticsVisitsData from './analytics-visits-data.vue';
import AnalyticsVisitsSales from './analytics-visits-sales.vue';
import AnalyticsVisitsSource from './analytics-visits-source.vue';
import AnalyticsVisits from './analytics-visits.vue';

const overviewItems = ref<AnalysisOverviewItem[]>([]);

// 获取数据并设置 overviewItems
onMounted(async () => {
  try {
    const res = await getDashboardCard({});
    overviewItems.value = res;
  } catch (error) {
    console.error('获取仪表盘数据失败:', error);
  }
});

const chartTabs: TabOption[] = [
  {
    label: '流量趋势',
    value: 'trends',
  },
  {
    label: '月访问量',
    value: 'visits',
  },
];
</script>

<template>
  <div class="p-5">
    <AnalysisOverview :items="overviewItems" />
    <AnalysisChartsTabs :tabs="chartTabs" class="mt-5">
      <template #trends>
        <AnalyticsTrends />
      </template>
      <template #visits>
        <AnalyticsVisits />
      </template>
    </AnalysisChartsTabs>

    <div class="mt-5 w-full md:flex">
      <AnalysisChartCard class="mt-5 md:mr-4 md:mt-0 md:w-1/3" title="访问数量">
        <AnalyticsVisitsData />
      </AnalysisChartCard>
      <AnalysisChartCard class="mt-5 md:mr-4 md:mt-0 md:w-1/3" title="访问来源">
        <AnalyticsVisitsSource />
      </AnalysisChartCard>
      <AnalysisChartCard class="mt-5 md:mt-0 md:w-1/3" title="访问来源">
        <AnalyticsVisitsSales />
      </AnalysisChartCard>
    </div>
  </div>
</template>
