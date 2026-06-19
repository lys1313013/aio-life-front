<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import type { TimeSlot } from '#/views/time/time-tracker/types';

import { onMounted, ref } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import dayjs from 'dayjs';

import { query } from '#/api/core/time-tracker';
import { listCategories } from '#/api/core/time-tracker-category';
import TimeTrackerModal from '#/views/time/time-tracker/components/TimeTrackerModal.vue';

const chartRef = ref<EchartsUIType>();
const timeTrackerModalRef = ref();
const { renderEcharts } = useEcharts(chartRef);
const loading = ref(false);

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

const loadData = async () => {
  loading.value = true;
  try {
    const today = dayjs().format('YYYY-MM-DD');
    const [categoriesRes, recordsRes] = await Promise.all([
      listCategories(),
      query({ condition: { date: today } }),
    ]);

    const categories = categoriesRes || [];
    const records = recordsRes.items || [];
    existingSlots.value = records;

    // 处理最新记录
    const sortedRecords = [...records].sort(
      (a, b) => b.startTime - a.startTime,
    );
    recentRecords.value = sortedRecords.slice(0, 5).map((record) => {
      const category = categories.find((c) => c.id === record.categoryId);
      const duration = record.endTime - record.startTime;
      const d = duration <= 0 ? 1 : duration;
      const h = Math.floor(d / 60);
      const m = d % 60;
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
        categoryName: category?.name || '未知',
        categoryColor: category?.color || '#ccc',
        timeRangeStr: `${formatTime(record.startTime)} ${durationStr}`,
        originalRecord: record as TimeSlot,
      };
    });

    // 处理时间轴区块 (改为竖向，自上而下 00:00 - 24:00)
    const totalMinutes = 24 * 60; // 一天总分钟数
    timelineBlocks.value = records.map((record) => {
      const category = categories.find((c) => c.id === record.categoryId);
      const startPercent = (record.startTime / totalMinutes) * 100;
      const heightPercent =
        ((record.endTime - record.startTime) / totalMinutes) * 100;
      return {
        id: record.id || Math.random().toString(),
        top: `${startPercent}%`,
        height: `${heightPercent}%`,
        color: category?.color || '#ccc',
      };
    });

    const categoryDurations: Record<string, number> = {};
    records.forEach((slot) => {
      const duration = slot.endTime - slot.startTime + 1;
      categoryDurations[slot.categoryId] =
        (categoryDurations[slot.categoryId] || 0) + duration;
    });

    const pieData = categories
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

    renderEcharts({
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
      series: [
        {
          animationDelay() {
            return Math.random() * 100;
          },
          animationEasing: 'exponentialInOut',
          animationType: 'scale',
          avoidLabelOverlap: true,
          padAngle: 2,
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
            borderRadius: 8,
          },
          label: {
            show: true,
            position: 'outside',
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
          radius: ['35%', '60%'],
          // center: 水平 55% 偏右，使得与右侧列表的距离更紧凑
          center: ['55%', '50%'],
          type: 'pie',
        },
      ],
    });
  } catch (error) {
    console.error('Failed to load time tracker data:', error);
  } finally {
    loading.value = false;
  }
};

const handleEditRecord = (record: TimeSlot) => {
  timeTrackerModalRef.value?.open(record, undefined, existingSlots.value);
};

const handleModalSuccess = () => {
  loadData();
};

onMounted(() => {
  loadData();
});

defineExpose({
  loadData,
});
</script>

<template>
  <div v-loading="loading" class="flex h-full w-full flex-row p-2 sm:p-4">
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
      <span class="text-[10px] leading-none text-muted-foreground/60">24</span>
    </div>

    <!-- 右侧内容区：饼图 + 最新记录 -->
    <div class="flex min-w-0 flex-1 flex-row items-center gap-1 sm:gap-2">
      <!-- 
        【经验沉淀：EchartsUI 高度塌陷/截断问题】
        @vben/plugins/echarts 提供的 EchartsUI 组件内部源码默认写死了 height: '300px'。
        如果在外层弹性布局（Flex）中不显式覆盖该属性，内部 canvas 会强制按 300px 渲染，
        导致在高度受限的卡片中出现严重的下沉和底部截断。
        
        解决方案：
        1. 外层包裹容器必须有明确的高度限制（如 h-[160px] 或最大高度）。
        2. EchartsUI 必须显式传入 height="100%" width="100%" 以覆盖内部默认值。
      -->
      <div class="relative h-[160px] w-[65%] min-w-0 sm:h-[180px] sm:w-[70%]">
        <EchartsUI ref="chartRef" height="100%" width="100%" />
      </div>

      <!-- 最新记录列表 (同步限制最大高度，防止撑破父容器) -->
      <div
        class="flex max-h-[160px] w-[35%] flex-col overflow-y-auto py-1 sm:max-h-[180px] sm:w-[30%]"
      >
        <div
          v-if="recentRecords.length > 0"
          class="flex flex-col gap-2.5 sm:gap-3.5"
        >
          <div
            v-for="record in recentRecords"
            :key="record.id"
            class="flex cursor-pointer items-center justify-end gap-1.5 font-mono text-[10px] transition-opacity hover:opacity-70 sm:gap-2 sm:text-[11px]"
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
          </div>
        </div>
        <div
          v-else
          class="flex h-full items-center justify-center text-xs text-muted-foreground"
        >
          今日暂无记录
        </div>
      </div>
    </div>

    <!-- 编辑记录弹窗 -->
    <TimeTrackerModal ref="timeTrackerModalRef" @success="handleModalSuccess" />
  </div>
</template>
