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
