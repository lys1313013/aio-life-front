<template>
  <Card class="chart-card">
    <div class="chart-container">
      <EchartsUI ref="chartRef" />
    </div>
  </Card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { Card } from 'ant-design-vue';
import dayjs from 'dayjs';
import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import type { TimeSlot, TimeSlotCategory } from '../types';

interface Props {
  timeSlots: TimeSlot[];
  categories: TimeSlotCategory[];
  selectedDate: dayjs.Dayjs;
  statMode: 'day' | 'week' | 'month';
}

const props = defineProps<Props>();
const chartRef = ref();
const { renderEcharts } = useEcharts(chartRef);

// 生成X轴数据和统计数据
const chartData = computed(() => {
  const xAxisData: string[] = [];
  const seriesData: Record<string, number[]> = {};

  // 初始化系列数据容器
  props.categories.forEach(cat => {
    seriesData[cat.id] = [];
  });

  if (props.statMode === 'day') {
    // 按小时统计 (0-23)
    for (let i = 0; i < 24; i++) {
      xAxisData.push(`${i}:00`);
    }

    // 初始化24小时的数据
    props.categories.forEach(cat => {
      seriesData[cat.id] = new Array(24).fill(0);
    });

    // 填充数据
    props.timeSlots.forEach(slot => {
      const startHour = Math.floor(slot.startTime / 60);
      const endHour = Math.floor(slot.endTime / 60);
      
      // 简单的处理：将时长分配给开始小时（或者更精确的分割）
      // 这里采用精确分割：如果跨越小时，分配给对应的小时
      for (let h = startHour; h <= endHour; h++) {
        const hourStart = h * 60;
        const hourEnd = (h + 1) * 60;
        
        const overlapStart = Math.max(hourStart, slot.startTime);
        const overlapEnd = Math.min(hourEnd, slot.endTime);
        
        if (overlapEnd > overlapStart) {
          const duration = overlapEnd - overlapStart;
          // 确保 seriesData[slot.categoryId] 存在
          if (!seriesData[slot.categoryId]) {
            seriesData[slot.categoryId] = new Array(24).fill(0);
          }
          const arr = seriesData[slot.categoryId];
          if (arr && arr[h] !== undefined) {
            arr[h] = (arr[h] || 0) + duration;
          }
        }
      }
    });

  } else {
    // 按天统计 (周或月)
    let startDate: dayjs.Dayjs;
    let daysCount: number;

    if (props.statMode === 'week') {
      startDate = props.selectedDate.startOf('isoWeek');
      daysCount = 7;
    } else { // month
      startDate = props.selectedDate.startOf('month');
      daysCount = props.selectedDate.daysInMonth();
    }

    const today = dayjs();

    // 生成日期序列
    for (let i = 0; i < daysCount; i++) {
      const date = startDate.add(i, 'day');
      
      // 如果日期在今天之后，则不展示（只展示到今天）
      if (date.isAfter(today, 'day')) {
        break;
      }

      const dateStr = date.format('YYYY-MM-DD');
      
      // X轴标签
      if (props.statMode === 'week') {
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        xAxisData.push(`${weekdays[date.day()]}`);
      } else {
        xAxisData.push(`${date.date()}`);
      }

      // 初始化当天数据
      props.categories.forEach(cat => {
        if (!seriesData[cat.id]) {
          seriesData[cat.id] = [];
        }
        const arr = seriesData[cat.id];
        // 如果是新的一天，push 0
        if (arr && arr.length <= i) {
          arr.push(0);
        }
      });

      // 统计当天数据
      // 优化：预先将slots按日期分组可能更快，但这里数据量不大，直接遍历也可
      const daySlots = props.timeSlots.filter(slot => slot.date === dateStr);
      daySlots.forEach(slot => {
        const duration = slot.endTime - slot.startTime + 1;
        const arr = seriesData[slot.categoryId];
        if (arr && arr[i] !== undefined) {
          arr[i] = (arr[i] || 0) + duration;
        }
      });
    }
  }

  return {
    xAxisData,
    seriesData
  };
});

const renderChart = () => {
  if (!chartRef.value) return;

  const { xAxisData, seriesData } = chartData.value;

  const series = props.categories.map(category => {
    return {
      name: category.name,
      type: 'line',
      stack: 'Total',
      areaStyle: {},
      emphasis: {
        focus: 'series'
      },
      data: seriesData[category.id] || [],
      itemStyle: {
        color: category.color
      },
      showSymbol: false,
      smooth: false
    };
  }).filter(s => {
    // 只显示有数据的系列，或者显示所有？
    // 堆叠图通常显示所有或者至少图例里有
    // 这里为了整洁，只显示有数据的？不，堆叠图如果缺了中间的层会塌陷吗？
    // Echarts处理得很好。保留所有分类可以让图例完整。
    const hasData = s.data && s.data.some((val: number) => val > 0);
    return hasData;
  });

  const options = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985'
        }
      },
      formatter: (params: any) => {
        let result = `${params[0].axisValueLabel}<br/>`;
        params.forEach((param: any) => {
          if (param.value > 0) {
            const duration = param.value;
            const hours = Math.floor(duration / 60);
            const minutes = Math.floor(duration % 60); // 取整
            const timeStr = hours > 0 ? `${hours}h${minutes}m` : `${minutes}m`;
            
            result += `${param.marker} ${param.seriesName}: ${timeStr}<br/>`;
          }
        });
        return result;
      }
    },
    legend: {
      data: props.categories.map(c => c.name),
      type: 'scroll',
      top: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: [
      {
        type: 'category',
        boundaryGap: false,
        data: xAxisData
      }
    ],
    yAxis: [
      {
        type: 'value',
        name: '时长(分)',
        max: props.statMode === 'day' ? 60 : 1450
      }
    ],
    series: series
  };

  renderEcharts(options as any);
};

watch(
  [() => props.timeSlots, () => props.statMode, () => props.selectedDate],
  () => {
    renderChart();
  },
  { immediate: true }
);

onMounted(() => {
  renderChart();
});
</script>

<style scoped>
.chart-card {
  min-width: 400px;
  flex: 2;
}
.chart-container {
  height: 300px;
  width: 100%;
}
</style>
