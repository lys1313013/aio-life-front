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
  height?: string;
}

defineOptions({ name: 'ContributionGraph' });

const props = withDefaults(defineProps<Props>(), {
  height: '156px',
});
const { data } = toRefs(props);

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);
const { isDark } = usePreferences();
const { token } = theme.useToken();

const colorPieces = computed(() => {
  if (isDark.value) {
    return [
      { color: '#252e2b', value: 0 },
      { color: '#304d3e', value: 1 },
      { color: '#417957', value: 2 },
      { color: '#63a577', value: 3 },
      { color: '#9bcea6', value: 4 },
    ];
  }

  return [
    { color: '#eef2ef', value: 0 },
    { color: '#c5e5ce', value: 1 },
    { color: '#8bc59d', value: 2 },
    { color: '#559f70', value: 3 },
    { color: '#33734e', value: 4 },
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
      cellSize: 12,
      dayLabel: {
        color: token.value.colorTextSecondary,
        firstDay: 0,
        fontSize: 11,
        margin: 10,
        nameMap: ['', '一', '', '三', '', '五', ''],
      },
      itemStyle: {
        borderWidth: 0,
        color: 'transparent',
      },
      left: 26,
      monthLabel: {
        color: token.value.colorTextSecondary,
        fontSize: 11,
        margin: 12,
      },
      range: [startDate, endDate],
      right: 2,
      splitLine: {
        show: false,
      },
      top: 26,
      bottom: 2,
      yearLabel: { show: false },
    },
    series: {
      coordinateSystem: 'calendar',
      data: formattedData,
      emphasis: {
        itemStyle: {
          shadowBlur: 6,
          shadowColor: isDark.value
            ? 'rgba(139, 197, 157, 0.2)'
            : 'rgba(51, 115, 78, 0.2)',
        },
      },
      itemStyle: {
        borderColor: token.value.colorBgContainer,
        borderRadius: 5,
        borderWidth: 4,
      },
      type: 'heatmap',
    },
    tooltip: {
      backgroundColor: token.value.colorBgElevated,
      borderColor: 'transparent',
      borderWidth: 0,
      extraCssText: 'border-radius: 10px;',
      padding: [10, 14],
      shadowBlur: 18,
      shadowColor: isDark.value
        ? 'rgba(0, 0, 0, 0.24)'
        : 'rgba(31, 55, 40, 0.12)',
      shadowOffsetY: 4,
      formatter: (params) => {
        const value = Array.isArray(params) ? params[0]?.value : params.value;
        if (!Array.isArray(value)) return '';
        const content = document.createElement('div');
        const date = document.createElement('div');
        date.textContent = String(value[0]);
        Object.assign(date.style, {
          color: token.value.colorTextSecondary,
          fontSize: '11px',
          lineHeight: '20px',
        });
        const count = document.createElement('strong');
        count.textContent = String(value[2] ?? 0);
        Object.assign(count.style, {
          fontSize: '16px',
          fontWeight: '600',
          lineHeight: '24px',
        });
        const unit = document.createElement('span');
        unit.textContent = ' 次提交';
        unit.style.color = token.value.colorTextSecondary;
        content.append(date, count, unit);
        return content;
      },
      textStyle: {
        color: token.value.colorText,
        fontSize: 12,
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
  <EchartsUI ref="chartRef" :height="height" />
</template>
