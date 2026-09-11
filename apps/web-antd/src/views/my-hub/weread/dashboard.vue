<script setup lang="ts">
import type { EchartsUIType } from '@vben/plugins/echarts';

import type { ReadingMode, ReadingStats } from '#/api/core/weread';

import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { DatePicker, Empty, Segmented, Spin } from 'ant-design-vue';
import dayjs from 'dayjs';

import { readingTime, safeLink } from './format';

const props = defineProps<{
  baseTime: number;
  loading: boolean;
  mode: ReadingMode;
  stats: ReadingStats;
}>();
const emit = defineEmits<{
  mode: [value: ReadingMode, baseTime?: number];
}>();
const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);
const modes = [
  { label: '周', value: 'weekly' },
  { label: '月', value: 'monthly' },
  { label: '年', value: 'annually' },
  { label: '累计', value: 'overall' },
];
const selectedDate = computed(() =>
  props.baseTime ? dayjs.unix(props.baseTime) : dayjs(),
);
const datePicker = computed(() =>
  props.mode === 'weekly'
    ? 'week'
    : props.mode === 'monthly'
      ? 'month'
      : 'year',
);
function selectDate(value: unknown) {
  if (!dayjs.isDayjs(value)) return;
  // Use China midnight so browser timezone cannot select an adjacent period.
  const timestamp = Math.floor(
    new Date(`${value.format('YYYY-MM-DD')}T00:00:00+08:00`).getTime() / 1000,
  );
  emit('mode', props.mode, timestamp);
}
const cards = computed(() => [
  {
    label: '阅读时长',
    value: readingTime(props.stats.totalReadTime),
  },
  {
    label: '阅读天数',
    value: props.stats.readDays == null ? '—' : `${props.stats.readDays} 天`,
  },
  {
    label: '日均阅读',
    value: readingTime(props.stats.dayAverageReadTime),
  },
  {
    label: '已读完',
    value: props.stats.readStat?.find((s) => s.stat === '读完')?.counts ?? '—',
  },
]);
async function draw() {
  await nextTick();
  const entries = Object.entries(props.stats.readTimes ?? {}).sort(
    (a, b) => Number(a[0]) - Number(b[0]),
  );
  renderEcharts({
    grid: { left: 12, right: 12, top: 30, bottom: 12, containLabel: true },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: entries.map(([timestamp]) =>
        new Date(Number(timestamp) * 1000).toLocaleDateString('zh-CN', {
          timeZone: 'Asia/Shanghai',
          ...(props.mode === 'annually'
            ? { month: 'numeric' }
            : props.mode === 'overall'
              ? { year: 'numeric' }
              : { month: 'numeric', day: 'numeric' }),
        }),
      ),
    },
    yAxis: { type: 'value', name: '分钟' },
    series: [
      {
        type: 'bar',
        name: '阅读时长（分钟）',
        barMaxWidth: 30,
        data: entries.map(([, v]) => Math.round(v / 60)),
        itemStyle: { borderRadius: [4, 4, 0, 0] },
      },
    ],
  });
}
onMounted(draw);
watch(() => [props.stats, props.mode], draw);
</script>
<template>
  <div class="wr-heading wr-dashboard-controls">
    <DatePicker
      v-if="mode !== 'overall'"
      :value="selectedDate"
      :picker="datePicker"
      :allow-clear="false"
      :disabled="loading"
      :disabled-date="(date) => date.isAfter(dayjs(), 'day')"
      aria-label="选择统计周期"
      @change="selectDate"
    />
    <Segmented
      :value="mode"
      :options="modes"
      :disabled="loading"
      @change="emit('mode', $event as ReadingMode)"
    />
  </div>
  <Spin :spinning="loading">
    <div class="wr-stats">
      <section v-for="card in cards" :key="card.label" class="wr-panel">
        <p>{{ card.label }}</p>
        <strong>{{ card.value }}</strong>
      </section>
    </div>
    <div class="wr-dashboard-grid">
      <section class="wr-panel">
        <h3>阅读时长趋势</h3>
        <EchartsUI
          v-if="Object.keys(stats.readTimes ?? {}).length > 0"
          ref="chartRef"
          height="270px"
        />
        <Empty v-else description="暂无阅读趋势" />
      </section>
      <section class="wr-panel">
        <h3>阅读最多的书</h3>
        <div
          v-for="(row, i) in stats.readLongest?.slice(0, 4)"
          :key="row.book?.bookId ?? i"
          class="wr-rank"
        >
          <span>{{ String(i + 1).padStart(2, '0') }}</span>
          <img
            v-if="safeLink(row.book?.cover ?? row.albumInfo?.cover)"
            :src="safeLink(row.book?.cover ?? row.albumInfo?.cover)"
            alt="封面"
          />
          <div>
            <p class="wr-clamp">{{ row.book?.title ?? row.albumInfo?.name }}</p>
            <small>{{ readingTime(row.readTime) }}</small>
          </div>
        </div>
        <Empty v-if="!stats.readLongest?.length" description="暂无阅读排行" />
      </section>
    </div>
  </Spin>
</template>
