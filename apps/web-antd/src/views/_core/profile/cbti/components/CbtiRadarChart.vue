<script setup lang="ts">
import type { EchartsUIType } from '@vben/plugins/echarts';

import type { CbtiDimensionScore } from '#/api/core/cbti';

import { computed, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

interface Props {
  dimensions: CbtiDimensionScore[];
}

const props = defineProps<Props>();

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

const modelMeta = [
  { key: 'C', name: '代码信仰' },
  { key: 'B', name: 'Bug应对' },
  { key: 'T', name: '团队协作' },
  { key: 'D', name: '驱动引擎' },
  { key: 'A', name: 'AI共处' },
] as const;

const modelScores = computed(() => {
  const grouped = new Map<string, number[]>();
  for (const d of props.dimensions || []) {
    const arr = grouped.get(d.model) ?? [];
    arr.push(d.percentage ?? 0);
    grouped.set(d.model, arr);
  }
  return modelMeta.map((m) => {
    const arr = grouped.get(m.key) ?? [];
    const avg =
      arr.length > 0
        ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
        : 0;
    return { ...m, value: avg };
  });
});

const render = () => {
  const indicators = modelScores.value.map((m) => ({ name: m.name, max: 100 }));
  const values = modelScores.value.map((m) => m.value);

  const option = {
    tooltip: { trigger: 'item' as const },
    radar: {
      indicator: indicators,
      radius: '70%',
      splitNumber: 4,
      axisName: {
        color: '#57534e',
        fontSize: 12,
        fontWeight: 700,
      },
      splitLine: {
        lineStyle: { color: ['#fed7aa', '#ffedd5', '#ffedd5', '#fff7ed'] },
      },
      splitArea: {
        areaStyle: {
          color: ['rgba(255, 247, 237, 0.8)', 'rgba(255, 247, 237, 0.4)'],
        },
      },
      axisLine: { lineStyle: { color: '#fed7aa' } },
    },
    series: [
      {
        type: 'radar' as const,
        data: [
          {
            value: values,
            name: 'CBTI',
            areaStyle: { color: 'rgba(249, 115, 22, 0.25)' },
            lineStyle: { color: '#f97316', width: 2 },
            itemStyle: { color: '#f97316' },
          },
        ],
      },
    ],
  };

  renderEcharts(option as any);
};

watch(modelScores, () => render(), { immediate: true });
</script>

<template>
  <div class="w-full">
    <EchartsUI ref="chartRef" />
  </div>
</template>
