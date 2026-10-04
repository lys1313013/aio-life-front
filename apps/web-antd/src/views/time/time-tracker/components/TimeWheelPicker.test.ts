import { mount } from '@vue/test-utils';

import dayjs from 'dayjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import TimeWheelPicker from './TimeWheelPicker.vue';

async function openPicker(value = '10:00', min = 0, max = 1439) {
  const wrapper = mount(TimeWheelPicker, {
    props: {
      value: dayjs(`2026-10-04T${value}:00`),
      label: '结束时间',
      min,
      max,
      showNow: true,
    },
    global: {
      stubs: {
        APopover: {
          props: ['open'],
          emits: ['update:open'],
          template:
            '<div><div @click="$emit(\'update:open\', true)"><slot /></div><slot v-if="open" name="content" /></div>',
        },
      },
    },
  });
  await wrapper.get('input').trigger('click');
  return wrapper;
}
async function scrollMinute(
  wrapper: Awaited<ReturnType<typeof openPicker>>,
  minute: number,
) {
  const column = wrapper.get('[aria-label="分钟"]');
  (column.element as HTMLElement).scrollTop = minute * 44;
  await column.trigger('scroll');
  await vi.advanceTimersByTimeAsync(120);
}
function selectedHour(wrapper: Awaited<ReturnType<typeof openPicker>>) {
  return wrapper.get('[aria-label="小时"] [aria-selected="true"]').text();
}
afterEach(() => vi.useRealTimers());

describe('时迹时间滚轮', () => {
  it('分钟 00 向前跨到上小时 59，再向后跨回下一小时 00', async () => {
    vi.useFakeTimers();
    const wrapper = await openPicker();
    await scrollMinute(wrapper, 599);
    expect(selectedHour(wrapper)).toBe('09');
    expect(
      wrapper.get('[aria-label="09:59"]').attributes('aria-selected'),
    ).toBe('true');
    await scrollMinute(wrapper, 600);
    expect(selectedHour(wrapper)).toBe('10');
    await wrapper
      .get('[aria-label="分钟"]')
      .trigger('keydown', { key: 'ArrowUp' });
    expect(selectedHour(wrapper)).toBe('09');
    wrapper.unmount();
  });
  it('禁选范围可见，滚动不能越过相邻记录和起止边界', async () => {
    vi.useFakeTimers();
    const wrapper = await openPicker('10:00', 600, 679);
    expect(
      wrapper.get('[aria-label="09:59"]').attributes('disabled'),
    ).toBeDefined();
    expect(
      wrapper.get('[aria-label="11:20"]').attributes('disabled'),
    ).toBeDefined();
    await scrollMinute(wrapper, 599);
    expect(
      wrapper.get('[aria-label="10:00"]').attributes('aria-selected'),
    ).toBe('true');
    await scrollMinute(wrapper, 700);
    expect(
      wrapper.get('[aria-label="11:19"]').attributes('aria-selected'),
    ).toBe('true');
    wrapper.unmount();
  });
  it('快速滚动后立即完成也保存最后位置，取消不修改表单', async () => {
    vi.useFakeTimers();
    const wrapper = await openPicker('09:59');
    const column = wrapper.get('[aria-label="分钟"]');
    (column.element as HTMLElement).scrollTop = 600 * 44;
    await column.trigger('scroll');
    await wrapper.findAll('.time-wheel-toolbar button')[2]!.trigger('click');
    expect(
      (wrapper.emitted('update:value')![0]![0] as dayjs.Dayjs).format('HH:mm'),
    ).toBe('10:00');
    wrapper.unmount();
    const cancelled = await openPicker();
    await scrollMinute(cancelled, 610);
    await cancelled.findAll('.time-wheel-toolbar button')[0]!.trigger('click');
    expect(cancelled.emitted('update:value')).toBeUndefined();
    cancelled.unmount();
  });
  it('手输和此刻也遵守禁选范围，当前时间变化后刷新禁用状态', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-04T11:19:59'));
    const wrapper = await openPicker('10:00', 600, 679);
    const now = wrapper.findAll('.time-wheel-toolbar button')[1]!;
    expect(now.attributes('disabled')).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1000);
    expect(now.attributes('disabled')).toBeDefined();
    await wrapper.get('input').setValue('11:20');
    expect(wrapper.emitted('update:value')).toBeUndefined();
    await wrapper.get('input').setValue('10:30');
    expect(
      (wrapper.emitted('update:value')![0]![0] as dayjs.Dayjs).format('HH:mm'),
    ).toBe('10:30');
    wrapper.unmount();
  });
});
