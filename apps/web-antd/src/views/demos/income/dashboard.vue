<script setup lang="ts">
import type { EchartsUIType } from '@vben/plugins/echarts';

import { computed, onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import {
  Card,
  Col,
  Radio,
  RadioGroup,
  Row,
  Select,
  Statistic,
} from 'ant-design-vue';

// 模拟数据
const mockData = {
  year: {
    '2023': {
      labels: [
        '2023-01',
        '2023-02',
        '2023-03',
        '2023-04',
        '2023-05',
        '2023-06',
        '2023-07',
        '2023-08',
        '2023-09',
        '2023-10',
        '2023-11',
        '2023-12',
      ],
      values: [
        8000, 11_000, 14_000, 17_000, 20_000, 23_000, 25_000, 27_000, 29_000,
        31_000, 33_000, 35_000,
      ],
      total: 296_000,
      avg: 24_667,
      max: 35_000,
      min: 8000,
    },
    '2024': {
      labels: [
        '2024-01',
        '2024-02',
        '2024-03',
        '2024-04',
        '2024-05',
        '2024-06',
        '2024-07',
        '2024-08',
        '2024-09',
        '2024-10',
        '2024-11',
        '2024-12',
      ],
      values: [
        10_000, 13_000, 16_000, 19_000, 22_000, 25_000, 27_000, 29_000, 31_000,
        33_000, 35_000, 37_000,
      ],
      total: 317_000,
      avg: 26_417,
      max: 37_000,
      min: 10_000,
    },
    '2025': {
      labels: [
        '2025-01',
        '2025-02',
        '2025-03',
        '2025-04',
        '2025-05',
        '2025-06',
        '2025-07',
        '2025-08',
        '2025-09',
        '2025-10',
        '2025-11',
        '2025-12',
      ],
      values: [
        12_000, 15_000, 18_000, 21_000, 25_000, 28_000, 30_000, 32_000, 35_000,
        38_000, 40_000, 42_000,
      ],
      total: 345_000,
      avg: 28_750,
      max: 42_000,
      min: 12_000,
    },
  },
};

const timeDimension = ref<'all-years' | 'year'>('year');
const selectedStartYear = ref('2023');
const selectedEndYear = ref('2025');

// 获取所有可用的年份
const availableYears = computed(() => {
  return Object.keys(mockData.year).sort();
});

// 获取所有年度数据
const allYearsData = computed(() => {
  return Object.entries(mockData.year)
    .map(([year, data]) => ({
      year,
      total: data.total,
      avg: data.avg,
      max: data.max,
      min: data.min,
    }))
    .sort((a, b) => a.year.localeCompare(b.year));
});

// 获取当前选中的数据
const chartData = computed(() => {
  if (timeDimension.value === 'year') {
    const startYear = selectedStartYear.value;
    const endYear = selectedEndYear.value;

    // 获取范围内的所有年份数据
    const yearsInRange = availableYears.value
      .filter((year) => year >= startYear && year <= endYear)
      .sort();

    if (yearsInRange.length === 0) {
      return mockData.year['2025'];
    }

    // 合并多个年份的数据
    const allLabels: string[] = [];
    const allValues: number[] = [];
    let total = 0;
    let max = 0;
    let min = Infinity;

    yearsInRange.forEach((year) => {
      const yearData = mockData.year[year];
      allLabels.push(...yearData.labels);
      allValues.push(...yearData.values);
      total += yearData.total;
      max = Math.max(max, yearData.max);
      min = Math.min(min, yearData.min);
    });

    const avg = total / yearsInRange.length;

    return {
      labels: allLabels,
      values: allValues,
      total,
      avg,
      max,
      min,
    };
  } else {
    // 全部年度模式
    return {
      labels: allYearsData.value.map((item) => `${item.year}年`),
      values: allYearsData.value.map((item) => item.total),
      total: allYearsData.value.reduce((sum, item) => sum + item.total, 0),
      avg:
        allYearsData.value.reduce((sum, item) => sum + item.avg, 0) /
        allYearsData.value.length,
      max: Math.max(...allYearsData.value.map((item) => item.max)),
      min: Math.min(...allYearsData.value.map((item) => item.min)),
    };
  }
});

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

// 更新图表
const updateChart = () => {
  const data = chartData.value;
  let titleText = '';

  if (timeDimension.value === 'year') {
    titleText =
      selectedStartYear.value === selectedEndYear.value
        ? `${selectedStartYear.value}年收入趋势`
        : `${selectedStartYear.value}-${selectedEndYear.value}年收入趋势`;
  } else {
    titleText = '年度总收入对比';
  }

  const isAllYears = timeDimension.value === 'all-years';

  renderEcharts({
    title: {
      text: titleText,
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold',
      },
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const data = params[0];
        return isAllYears
          ? `${data.name}<br/>年度总收入: ¥${data.value.toLocaleString()}`
          : `${data.name}<br/>收入: ¥${data.value.toLocaleString()}`;
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.labels,
      axisLine: {
        lineStyle: {
          color: '#ddd',
        },
      },
    },
    yAxis: {
      type: 'value',
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      splitLine: {
        lineStyle: {
          type: 'dashed',
          color: '#eee',
        },
      },
    },
    series: [
      {
        name: isAllYears ? '年度总收入' : '收入',
        type: isAllYears ? 'bar' : 'line',
        data: data.values,
        smooth: !isAllYears,
        symbol: isAllYears ? 'none' : 'circle',
        symbolSize: 8,
        itemStyle: {
          color: isAllYears ? '#722ed1' : '#1890ff',
        },
        lineStyle: {
          width: 3,
          color: '#1890ff',
        },
        areaStyle: isAllYears
          ? undefined
          : {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(24, 144, 255, 0.4)' },
                  { offset: 1, color: 'rgba(24, 144, 255, 0.1)' },
                ],
              },
            },
        label: {
          show: true,
          position: isAllYears ? 'top' : 'top',
          formatter: (params: any) => {
            return `${params.value.toLocaleString()}`;
          },
          fontSize: 12,
          fontWeight: 'bold',
          color: isAllYears ? '#722ed1' : '#1890ff',
        },
      },
    ],
  });
};

onMounted(() => {
  updateChart();
});

// 监听维度变化
watch(
  [timeDimension, selectedStartYear, selectedEndYear],
  () => {
    updateChart();
  },
  { deep: true },
);
</script>

<template>
  <div class="income-dashboard">
    <!-- 头部控制区域 -->
    <Card class="mb-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <RadioGroup v-model:value="timeDimension">
            <Radio value="year">按月度</Radio>
            <Radio value="all-years">按年度</Radio>
          </RadioGroup>

          <!-- 年份选择器 -->
          <div v-if="timeDimension === 'year'" class="flex items-center gap-2">
            <Select
              v-model:value="selectedStartYear"
              :options="
                availableYears.map((year) => ({
                  value: year,
                  label: `${year}年`,
                }))
              "
              style="width: 100px"
              placeholder="开始年份"
            />
            <span class="text-gray-400">至</span>
            <Select
              v-model:value="selectedEndYear"
              :options="
                availableYears.map((year) => ({
                  value: year,
                  label: `${year}年`,
                }))
              "
              style="width: 100px"
              placeholder="结束年份"
            />
          </div>
          <div v-else :style="{ height: '32px' }"></div>
        </div>
      </div>
    </Card>

    <!-- 统计卡片区域 -->
    <Row :gutter="16" class="mb-6">
      <Col :span="6">
        <Card>
          <Statistic
            :title="timeDimension === 'all-years' ? '所有年度总收入' : '总收入'"
            :value="chartData.total"
            :precision="2"
            prefix="¥"
            :value-style="{ color: '#3f8600' }"
          />
        </Card>
      </Col>
      <Col :span="6">
        <Card>
          <Statistic
            :title="timeDimension === 'all-years' ? '平均年度收入' : '平均收入'"
            :value="chartData.avg"
            :precision="2"
            prefix="¥"
            :value-style="{ color: '#1890ff' }"
          />
        </Card>
      </Col>
      <Col :span="6">
        <Card>
          <Statistic
            :title="timeDimension === 'all-years' ? '最高年度收入' : '最高收入'"
            :value="chartData.max"
            :precision="2"
            prefix="¥"
            :value-style="{ color: '#cf1322' }"
          />
        </Card>
      </Col>
      <Col :span="6">
        <Card>
          <Statistic
            :title="timeDimension === 'all-years' ? '最低年度收入' : '最低收入'"
            :value="chartData.min"
            :precision="2"
            prefix="¥"
            :value-style="{ color: '#faad14' }"
          />
        </Card>
      </Col>
    </Row>

    <!-- 图表区域 -->
    <Card>
      <EchartsUI ref="chartRef" style="height: 400px; width: 100%" />
    </Card>
  </div>
</template>

<style scoped>
.income-dashboard {
  padding: 16px;
}

:deep(.ant-statistic-content) {
  font-size: 24px;
  font-weight: bold;
}

:deep(.ant-card) {
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

:deep(.ant-card-head) {
  border-bottom: 1px solid #f0f0f0;
}
</style>
