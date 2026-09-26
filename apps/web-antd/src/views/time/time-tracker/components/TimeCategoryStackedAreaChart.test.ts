import { mount } from '@vue/test-utils';

import dayjs from 'dayjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TimeCategoryStackedAreaChart from './TimeCategoryStackedAreaChart.vue';

const { renderEcharts } = vi.hoisted(() => ({ renderEcharts: vi.fn() }));

vi.mock('@vben/plugins/echarts', () => ({
  EchartsUI: { template: '<div />' },
  useEcharts: () => ({ renderEcharts }),
}));

vi.mock('ant-design-vue', () => ({
  Card: { template: '<div><slot /></div>' },
}));

vi.mock('../config', () => ({
  getCategoryColor: () => '#1890ff',
  getCategoryName: () => '学习',
}));

function getHourlyDurations(startTime: number, endTime: number): number[] {
  const wrapper = mount(TimeCategoryStackedAreaChart, {
    props: {
      categories: [{ id: 'learning', name: '学习', color: '#1890ff' }],
      selectedDate: dayjs('2026-09-12'),
      statMode: 'day',
      timeSlots: [
        {
          id: 'record',
          categoryId: 'learning',
          date: '2026-09-12',
          startTime,
          endTime,
        },
      ],
    },
  });
  const options = renderEcharts.mock.lastCall?.[0];
  wrapper.unmount();
  return options.series[0].data;
}

describe('timeCategoryStackedAreaChart hourly durations', () => {
  beforeEach(() => {
    renderEcharts.mockClear();
  });

  it('counts an inclusive hour as 60 minutes', () => {
    const durations = getHourlyDurations(600, 659);
    expect(durations[10]).toBe(60);
    expect(durations.reduce((sum, duration) => sum + duration, 0)).toBe(60);
  });

  it('assigns a minute on either side of an hour boundary to its own hour', () => {
    const durations = getHourlyDurations(659, 660);
    expect(durations[10]).toBe(1);
    expect(durations[11]).toBe(1);
    expect(durations.reduce((sum, duration) => sum + duration, 0)).toBe(2);
  });

  it('includes the last minute of the day', () => {
    const durations = getHourlyDurations(1439, 1439);
    expect(durations[23]).toBe(1);
    expect(durations.reduce((sum, duration) => sum + duration, 0)).toBe(1);
  });

  it('accounts for all 1440 minutes of a full day without double counting', () => {
    expect(getHourlyDurations(0, 1439)).toEqual(
      Array.from({ length: 24 }, () => 60),
    );
  });
});

describe('两级分类图表统计', () => {
  it('日模式按一级汇总子分类，选择一级后展示各子级且不漏数据', () => {
    const props = {
      categories: [
        { id: 'work', name: '工作', color: '#1890ff', parentId: '0' },
        { id: 'code', name: '开发', color: '#2890ff', parentId: 'work' },
      ],
      selectedDate: dayjs('2026-09-12'),
      statMode: 'day' as const,
      timeSlots: [
        {
          id: '1',
          categoryId: 'work',
          date: '2026-09-12',
          startTime: 600,
          endTime: 629,
        },
        {
          id: '2',
          categoryId: 'code',
          date: '2026-09-12',
          startTime: 630,
          endTime: 659,
        },
      ],
    };
    const summary = mount(TimeCategoryStackedAreaChart, { props });
    expect(renderEcharts.mock.lastCall?.[0].series).toHaveLength(1);
    expect(renderEcharts.mock.lastCall?.[0].series[0].data[10]).toBe(60);
    summary.unmount();
    const detail = mount(TimeCategoryStackedAreaChart, {
      props: { ...props, selectedFilterCategoryIds: ['work'] },
    });
    expect(renderEcharts.mock.lastCall?.[0].series).toHaveLength(2);
    expect(
      renderEcharts.mock.lastCall?.[0].series.map(
        (s: { data: number[] }) => s.data[10],
      ),
    ).toEqual([30, 30]);
    detail.unmount();
  });
});
