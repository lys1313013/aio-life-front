<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import { computed, ref, toRefs, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { usePreferences } from '@vben/preferences';
import { theme } from 'ant-design-vue';

interface ContributionItem {
  count: number;
  date: string;
  level: number;
}

interface Props {
  data: ContributionItem[];
}

defineOptions({ name: 'ContributionGraph' });

const props = defineProps<Props>();
const { data } = toRefs(props);

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);
const { isDark } = usePreferences();
const { token } = theme.useToken();

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

function updateChart() {
  if (!data.value || data.value.length === 0) return;

  const contributions = [...data.value].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  const formattedData = contributions.map((item) => [
    item.date,
    item.level,
    item.count,
  ]);

  const startDate = formattedData.at(0)?.[0];
  const endDate = formattedData.at(-1)?.[0];

  if (!startDate || !endDate) return;

  renderEcharts(() => ({
    calendar: {
      cellSize: 13,
      dayLabel: {
        color: token.value.colorTextSecondary,
        firstDay: 0,
        margin: 10,
        nameMap: ['', 'Mon', '', 'Wed', '', 'Fri', ''],
      },
      left: 36,
      monthLabel: {
        color: token.value.colorTextSecondary,
        margin: 10,
      },
      range: [startDate, endDate],
      right: 12,
      splitLine: {
        show: false,
      },
      top: 45,
      yearLabel: { show: false },
    },
    series: {
      coordinateSystem: 'calendar',
      data: formattedData,
      itemStyle: {
        borderColor: token.value.colorBgContainer,
        borderRadius: 2,
        borderWidth: 3,
      },
      type: 'heatmap',
    },
    tooltip: {
      backgroundColor: token.value.colorBgElevated,
      borderColor: token.value.colorBorderSecondary,
      formatter: (params: any) => {
        const date = params?.value?.[0] ?? '';
        const count = params?.value?.[2] ?? 0;
        return `${date}<br/>Contributions: <strong>${count}</strong>`;
      },
      textStyle: {
        color: token.value.colorText,
      },
    },
    visualMap: {
      dimension: 1,
      max: 4,
      min: 0,
      pieces: colorPieces.value.map((p) => ({
        color: p.color,
        value: p.value,
      })),
      show: false,
      type: 'piecewise',
    },
  }));
}

watch(
  [data, () => token.value.colorBgContainer, isDark],
  () => {
    updateChart();
  },
  { deep: true, immediate: true },
);
</script>

<template>
  <EchartsUI ref="chartRef" height="160px" />
</template>
