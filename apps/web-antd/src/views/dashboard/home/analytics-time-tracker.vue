<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import type { TimeSlot } from '#/views/time/time-tracker/types';

import { onMounted, ref } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import dayjs from 'dayjs';

import { query } from '#/api/core/time-tracker';
import { listCategories } from '#/api/core/time-tracker-category';
import {
  categoryPath,
  categoryStatistics,
} from '#/views/time/time-tracker/category-tree';
import TimeTrackerModal from '#/views/time/time-tracker/components/TimeTrackerModal.vue';
import { getSlotDuration } from '#/views/time/time-tracker/utils';

import { useHomeRequest } from './composables/useHomeRequest';

const emit = defineEmits<{
  success: [];
  'update:last-end': [value: number];
}>();

const chartRef = ref<EchartsUIType>();
const recentRecordScrollRef = ref<HTMLDivElement>();
const timeTrackerModalRef = ref();
const { renderEcharts } = useEcharts(chartRef);

interface RecentRecord {
  id: string;
  categoryName: string;
  categoryColor: string;
  timeRangeStr: string;
  originalRecord: TimeSlot;
}

interface TimelineBlock {
  id: string;
  top: string;
  height: string;
  color: string;
}

const recentRecords = ref<RecentRecord[]>([]);
const timelineBlocks = ref<TimelineBlock[]>([]);
const existingSlots = ref<TimeSlot[]>([]);

const formatTime = (minutes: number) => {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

const request = useHomeRequest({
  fetch: async () => {
    const today = dayjs().format('YYYY-MM-DD');
    const [categories, records] = await Promise.all([
      listCategories(true),
      query({ condition: { date: today } }),
    ]);
    return { categories, records, date: today };
  },
  apply: ({ categories: categoriesRes, records: recordsRes, date }) => {
    if (date !== dayjs().format('YYYY-MM-DD')) {
      void Promise.resolve().then(() => loadData(true));
      return;
    }

    const categories = categoriesRes || [];
    const records = recordsRes || [];
    existingSlots.value = records;

    // 今日全部明细按开始时间倒序展示，由列表独立滚动。
    const sortedRecords = [...records].sort(
      (a, b) => b.startTime - a.startTime,
    );
    recentRecords.value = sortedRecords.map((record) => {
      const category = categories.find((c) => c.id === record.categoryId);
      const duration = getSlotDuration(record);
      const h = Math.floor(duration / 60);
      const m = duration % 60;
      let durationStr = '';
      if (h > 0 && m > 0) {
        durationStr = `${h}h${m}m`;
      } else if (h > 0) {
        durationStr = `${h}h`;
      } else {
        durationStr = `${m}m`;
      }

      return {
        id: record.id || Math.random().toString(),
        categoryName: categoryPath(record.categoryId, categories),
        categoryColor: category?.color || '#ccc',
        timeRangeStr: `${formatTime(record.startTime)} ${durationStr}`,
        originalRecord: record as TimeSlot,
      };
    });

    // 闭区间末分钟结束后的边界，用于计算距离上次记录已过去多久；0 表示无记录
    const lastEndTime =
      sortedRecords.length > 0 ? sortedRecords[0]!.endTime + 1 : 0;
    emit('update:last-end', lastEndTime);

    // 处理时间轴区块 (改为竖向，自上而下 00:00 - 24:00)
    const totalMinutes = 24 * 60; // 一天总分钟数
    timelineBlocks.value = records.map((record) => {
      const category = categories.find((c) => c.id === record.categoryId);
      const startPercent = (record.startTime / totalMinutes) * 100;
      const heightPercent = (getSlotDuration(record) / totalMinutes) * 100;
      return {
        id: record.id || Math.random().toString(),
        top: `${startPercent}%`,
        height: `${heightPercent}%`,
        color: category?.color || '#ccc',
      };
    });

    const statistics = categoryStatistics(
      categories.map((c) => ({
        ...c,
        id: c.id!,
        isTrackTime: c.isTrackTime === 1,
      })),
      records,
    );
    const categoryDurations: Record<string, number> = {};
    statistics.timeSlots.forEach((slot) => {
      const duration = getSlotDuration(slot);
      categoryDurations[slot.categoryId] =
        (categoryDurations[slot.categoryId] || 0) + duration;
    });

    const pieData = statistics.categories
      .map((category) => {
        const duration = categoryDurations[category.id || ''] || 0;
        const isSmall = duration < 30;
        return {
          name: category.name,
          value: duration,
          itemStyle: {
            color: category.color,
          },
          // 时长小于 30 分钟的不显示外部标签和指引线,避免拥挤
          label: { show: !isSmall },
          labelLine: { show: !isSmall },
        };
      })
      .filter((item) => item.value > 0);

    const totalDuration = Object.values(categoryDurations).reduce(
      (sum, val) => sum + val,
      0,
    );
    const totalHours = Math.floor(totalDuration / 60);
    const totalMins = totalDuration % 60;
    let totalStr = '';
    if (totalHours > 0 && totalMins > 0) {
      totalStr = `${totalHours}h${totalMins}m`;
    } else if (totalHours > 0) {
      totalStr = `${totalHours}h`;
    } else {
      totalStr = `${totalMins}m`;
    }

    emit('update:last-end', lastEndTime);

    renderEcharts({
      title: {
        text: totalDuration > 0 ? totalStr : '',
        left: 'center',
        top: '50%',
        padding: 0,
        textVerticalAlign: 'middle',
        textStyle: {
          fontSize: 14,
          fontWeight: 'bold',
        },
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const duration = params.value;
          const hours = Math.floor(duration / 60);
          const minutes = duration % 60;
          const percentage = params.percent;
          let timeStr = '';
          if (hours > 0 && minutes > 0) {
            timeStr = `${hours}h${minutes}m`;
          } else if (hours > 0) {
            timeStr = `${hours}h`;
          } else {
            timeStr = `${minutes}m`;
          }
          return `${params.name}<br/>${timeStr} (${percentage}%)<br/>总时长: ${duration}m`;
        },
      },
      legend: {
        show: false,
      },
      media: [
        {
          query: { maxWidth: 200 },
          option: {
            // 底部外置标签占用更多高度，圆环与总时长同步上移以平衡留白。
            title: { top: '40%', textStyle: { fontSize: 12 } },
            series: [{ top: '-10%', bottom: '10%', radius: ['35%', '55%'] }],
          },
        },
        {
          option: {
            title: { top: '50%', textStyle: { fontSize: 14 } },
            series: [{ top: 0, bottom: 0, radius: ['45%', '70%'] }],
          },
        },
      ],
      series: [
        {
          animationDelay() {
            return Math.random() * 100;
          },
          animationEasing: 'exponentialInOut',
          animationType: 'scale',
          avoidLabelOverlap: true,
          data:
            pieData.length > 0
              ? pieData
              : [
                  {
                    name: '今日暂无记录',
                    value: 0,
                    itemStyle: { color: '#ccc' },
                    label: { show: false },
                    labelLine: { show: false },
                  },
                ],
          emphasis: {
            label: {
              fontSize: '14',
              fontWeight: 'bold',
              show: true,
            },
          },
          itemStyle: {
            borderWidth: 0,
            borderColor: 'transparent',
          },
          label: {
            show: true,
            position: 'outside',
            bleedMargin: 0,
            formatter: (params: any) => {
              const duration = params.value;
              const hours = Math.floor(duration / 60);
              const minutes = duration % 60;
              if (hours > 0 && minutes > 0) {
                return `${params.name}\n${hours}h${minutes}m`;
              } else if (hours > 0) {
                return `${params.name}\n${hours}h`;
              } else {
                return `${params.name}\n${minutes}m`;
              }
            },
            fontSize: 10,
            lineHeight: 12,
          },
          labelLine: {
            show: true,
            length: 5,
            length2: 8,
          },
          name: '时间分类',
          radius: ['45%', '70%'],
          center: ['50%', '50%'],
          type: 'pie',
        },
      ],
    });
  },
});
const { loading, loaded, failed } = request;
const loadData = (force = false) => request.load(force);

const handleRecordWheel = (event: WheelEvent) => {
  const list = recentRecordScrollRef.value;
  if (!list || event.ctrlKey || event.deltaY === 0) return;

  const maxScrollTop = list.scrollHeight - list.clientHeight;
  if (maxScrollTop <= 0) return;

  const unit =
    event.deltaMode === 1
      ? list.clientHeight / 5
      : event.deltaMode === 2
        ? list.clientHeight
        : 1;
  const nextScrollTop = Math.max(
    0,
    Math.min(maxScrollTop, list.scrollTop + event.deltaY * unit),
  );
  // 还能滚动明细时，饼图和列表区域统一带动明细；边界交还页面滚动。
  if (nextScrollTop === list.scrollTop) return;
  event.preventDefault();
  event.stopPropagation();
  list.scrollTop = nextScrollTop;
};

const handleEditRecord = (record: TimeSlot) => {
  timeTrackerModalRef.value?.open(record, undefined, existingSlots.value);
};

const handleModalSuccess = () => {
  emit('success');
};

onMounted(() => {
  loadData();
});

defineExpose({
  loadData,
  loading,
  loaded,
  failed,
});
</script>

<template>
  <div
    v-loading="{
      spinning: loading,
      class: '!bg-transparent dark:!bg-transparent',
    }"
    class="relative flex h-full w-full flex-row p-2 sm:py-4"
    @wheel.capture="handleRecordWheel"
  >
    <button
      v-if="failed && !loaded"
      type="button"
      aria-label="时迹加载失败，重试"
      :disabled="loading"
      class="m-auto rounded p-2 text-xs text-primary"
      @click="loadData()"
    >
      加载失败，重试
    </button>
    <template v-else>
      <!-- 最左侧竖向时间轴 (固定宽度，绝不被挤压) -->
      <div
        class="flex w-6 shrink-0 flex-col items-center justify-between pr-1 sm:w-8 sm:pr-2"
      >
        <span class="text-[10px] leading-none text-muted-foreground/60">0</span>
        <!-- 时间轴背景与彩色区块 -->
        <div
          class="relative my-1 w-2 flex-1 overflow-hidden rounded-full bg-secondary sm:w-2.5"
        >
          <div
            v-for="block in timelineBlocks"
            :key="block.id"
            class="absolute w-full"
            :style="{
              top: block.top,
              height: block.height,
              backgroundColor: block.color,
            }"
          ></div>
        </div>
        <span class="text-[10px] leading-none text-muted-foreground/60"
          >24</span
        >
      </div>

      <!-- 右侧内容区：饼图 + 最新记录 -->
      <div class="flex min-w-0 flex-1 flex-row items-center gap-1">
        <!--
        【经验沉淀：EchartsUI 高度塌陷/截断问题】
        @vben/plugins/echarts 提供的 EchartsUI 组件内部源码默认写死了 height: '300px'。
        如果在外层弹性布局（Flex）中不显式覆盖该属性，内部 canvas 会强制按 300px 渲染，
        导致在高度受限的卡片中出现严重的下沉和底部截断。

        解决方案：
        1. 外层包裹容器必须有明确的高度限制（如 h-[160px] 或最大高度）。
        2. EchartsUI 必须显式传入 height="100%" width="100%" 以覆盖内部默认值。
      -->
        <div class="relative h-[160px] min-w-0 flex-1 sm:h-[180px]">
          <EchartsUI ref="chartRef" height="100%" width="100%" />
        </div>

        <!-- 同时完整显示五条；少量明细居中，更多记录从顶部开始滚动。 -->
        <div
          ref="recentRecordScrollRef"
          class="time-record-scroll h-[160px] w-[42%] min-w-0 shrink-0 overflow-y-auto overscroll-contain sm:h-[180px]"
          role="region"
          aria-label="今日时迹明细"
          tabindex="0"
        >
          <div
            v-if="recentRecords.length > 0"
            class="flex min-h-full flex-col justify-center"
          >
            <button
              v-for="record in recentRecords"
              :key="record.id"
              type="button"
              class="flex h-8 w-full shrink-0 cursor-pointer items-center justify-end gap-1.5 rounded-sm font-mono text-[10px] leading-tight transition-opacity hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:h-9 sm:gap-2 sm:text-[11px]"
              :aria-label="`编辑时迹 ${record.timeRangeStr} ${record.categoryName}`"
              :style="{ color: record.categoryColor }"
              @click="handleEditRecord(record.originalRecord)"
            >
              <!-- 时间段 -->
              <span class="shrink-0">
                {{ record.timeRangeStr }}
              </span>
              <!-- 分类名称 -->
              <span class="min-w-0 truncate">
                {{ record.categoryName }}
              </span>
            </button>
          </div>
          <div
            v-else
            class="flex h-full items-center justify-center text-xs text-muted-foreground"
          >
            今日暂无记录
          </div>
        </div>
      </div>
    </template>
    <!-- 编辑记录弹窗 -->
    <TimeTrackerModal ref="timeTrackerModalRef" @success="handleModalSuccess" />
  </div>
</template>
