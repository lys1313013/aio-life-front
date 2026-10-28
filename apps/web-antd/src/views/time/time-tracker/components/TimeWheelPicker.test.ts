import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

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
          name: 'APopover',
          props: ['open'],
          emits: ['update:open'],
          template:
            '<div><div @click="$emit(\'update:open\', true)"><slot /></div><slot v-if="open" name="content" /></div>',
        },
      },
    },
  });
  await wrapper.setProps({
    'onUpdate:value': (value: dayjs.Dayjs) => {
      void wrapper.setProps({ value });
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
  (column.element as HTMLElement).scrollTop = minute * 32;
  await column.trigger('scroll');
  await vi.advanceTimersByTimeAsync(120);
}
function selectedHour(wrapper: Awaited<ReturnType<typeof openPicker>>) {
  return wrapper.get('[aria-label="小时"] [aria-selected="true"]').text();
}
function selectedTime(wrapper: Awaited<ReturnType<typeof openPicker>>) {
  return (wrapper.emitted('update:value')!.at(-1)![0] as dayjs.Dayjs).format(
    'HH:mm',
  );
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
  it('先滚动小时再跨分钟边界，另一列的同步事件不回退当前值', async () => {
    vi.useFakeTimers();
    const wrapper = await openPicker('09:59');
    const hour = wrapper.get('[aria-label="小时"]');
    const minute = wrapper.get('[aria-label="分钟"]');
    (hour.element as HTMLElement).scrollTop = 11 * 32;
    await hour.trigger('scroll');
    expect(selectedTime(wrapper)).toBe('11:59');
    expect((minute.element as HTMLElement).scrollTop).toBe(719 * 32);
    await minute.trigger('scroll');
    expect(selectedTime(wrapper)).toBe('11:59');
    (minute.element as HTMLElement).scrollTop = 720.3 * 32;
    await minute.trigger('scroll');
    expect(selectedTime(wrapper)).toBe('12:00');
    expect((hour.element as HTMLElement).scrollTop).toBe(12 * 32);
    await hour.trigger('scroll');
    expect((minute.element as HTMLElement).scrollTop).toBe(720.3 * 32);
    await vi.advanceTimersByTimeAsync(120);
    expect((minute.element as HTMLElement).scrollTop).toBe(720 * 32);
    expect(selectedTime(wrapper)).toBe('12:00');
    wrapper.unmount();
  });
  it('滚动立即写入表单，未等待吸附就点外部或 Escape 也保留时间', async () => {
    vi.useFakeTimers();
    const wrapper = await openPicker('09:59');
    const column = wrapper.get('[aria-label="分钟"]');
    (column.element as HTMLElement).scrollTop = 600 * 32;
    await column.trigger('scroll');
    expect(selectedTime(wrapper)).toBe('10:00');
    expect(wrapper.get('input').element.value).toBe('10:00');
    expect(wrapper.get('input').attributes('aria-expanded')).toBe('true');
    wrapper.getComponent({ name: 'APopover' }).vm.$emit('update:open', false);
    await nextTick();
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    expect(wrapper.get('input').element.value).toBe('10:00');
    await vi.advanceTimersByTimeAsync(120);
    await wrapper.get('input').trigger('click');
    expect(selectedHour(wrapper)).toBe('10');
    await wrapper
      .get('[aria-label="分钟"]')
      .trigger('keydown', { key: 'ArrowUp' });
    expect(selectedTime(wrapper)).toBe('09:59');
    await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Escape' });
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    expect(wrapper.get('input').element.value).toBe('09:59');
    wrapper.unmount();
  });
  it('点选小时分钟立即更新，保留弹层并只显示此刻快捷操作', async () => {
    vi.useFakeTimers();
    const wrapper = await openPicker();
    expect(
      wrapper.findAll('.time-wheel-toolbar button').map((b) => b.text()),
    ).toEqual(['此刻']);
    await wrapper
      .get('[aria-label="小时"]')
      .findAll('button')[11]!
      .trigger('click');
    expect(selectedTime(wrapper)).toBe('11:00');
    await wrapper.get('[aria-label="11:02"]').trigger('click');
    expect(selectedTime(wrapper)).toBe('11:02');
    expect(wrapper.get('input').attributes('aria-expanded')).toBe('true');
    expect(wrapper.get('input').element.value).toBe('11:02');
    await wrapper.setProps({ showNow: false });
    expect(wrapper.find('.time-wheel-toolbar').exists()).toBe(false);
    wrapper.unmount();
  });
  it('父表单即时回写不抢滚动位置，外部更改仍能同步选择器', async () => {
    vi.useFakeTimers();
    const wrapper = await openPicker('09:59');
    const column = wrapper.get('[aria-label="分钟"]');
    (column.element as HTMLElement).scrollTop = 600.3 * 32;
    await column.trigger('scroll');
    expect(selectedTime(wrapper)).toBe('10:00');
    expect((column.element as HTMLElement).scrollTop).toBe(600.3 * 32);
    expect(selectedHour(wrapper)).toBe('10');
    await vi.advanceTimersByTimeAsync(120);
    expect((column.element as HTMLElement).scrollTop).toBe(600 * 32);
    await wrapper.setProps({ value: dayjs('2026-10-04T11:02:00') });
    expect(selectedHour(wrapper)).toBe('11');
    expect((column.element as HTMLElement).scrollTop).toBe(662 * 32);
    wrapper.unmount();
  });
  it('手输和此刻也遵守禁选范围，当前时间变化后刷新禁用状态', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-04T11:19:59'));
    const wrapper = await openPicker('10:00', 600, 679);
    const now = wrapper.get('[aria-label="结束时间设为此刻"]');
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
  it('此刻立即更新并收起，保留日期和闭区间分钟', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-05T10:24:30'));
    const wrapper = await openPicker('10:00', 600, 679);
    await wrapper.get('[aria-label="结束时间设为此刻"]').trigger('click');
    expect(selectedTime(wrapper)).toBe('10:24');
    expect(wrapper.props('value')?.format('YYYY-MM-DD')).toBe('2026-10-04');
    expect(wrapper.get('input').attributes('aria-expanded')).toBe('false');
    wrapper.unmount();
  });
});
