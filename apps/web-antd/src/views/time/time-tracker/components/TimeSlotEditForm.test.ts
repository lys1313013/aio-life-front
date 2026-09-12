import type { TimeSlot } from '../types';

import { shallowMount } from '@vue/test-utils';

import { Form, InputNumber, TimePicker } from 'ant-design-vue';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { describe, expect, it, vi } from 'vitest';

import TimeSlotEditForm from './TimeSlotEditForm.vue';

vi.mock('#/api/core/time-tracker', () => ({ getRelateTypes: async () => [] }));
vi.mock('#/api/core/userDictType', () => ({
  getByDictType: async () => ({ dictDetailList: [] }),
}));
vi.mock('@vben/icons', () => ({ createIconifyIcon: () => 'span' }));

dayjs.extend(customParseFormat);

function mountForm(
  startTime: number,
  endTime: number,
  existingSlots: TimeSlot[] = [],
) {
  return shallowMount(TimeSlotEditForm, {
    props: {
      slot: {
        id: 'current',
        date: '2026-09-12',
        categoryId: 'read',
        startTime,
        endTime,
      },
      categories: [{ id: 'read', name: '读书', color: '#1890ff' }],
      existingSlots,
    },
    global: {
      renderStubDefaultSlot: true,
      stubs: {
        AInput: { inheritAttrs: false, template: '<div />' },
        AInputNumber: {
          inheritAttrs: false,
          props: ['value'],
          emits: ['update:value'],
          template: '<div />',
        },
      },
    },
  });
}

function getEndTimeValue(wrapper: ReturnType<typeof mountForm>): string {
  const value = wrapper.findAllComponents(TimePicker)[1]!.props('value');
  if (!dayjs.isDayjs(value)) throw new Error('结束时间应为 Dayjs');
  return value.format('HH:mm');
}

describe('时迹编辑器的闭区间输入', () => {
  it('输入 30 分钟后，结束于 09:29 且仍显示 30 分钟', async () => {
    const wrapper = mountForm(540, 540);
    const minutes = wrapper.findAllComponents(InputNumber)[1]!;
    minutes.vm.$emit('update:value', 30);
    await wrapper.vm.$nextTick();
    expect(getEndTimeValue(wrapper)).toBe('09:29');
    expect(minutes.props('value')).toBe(30);
    wrapper.unmount();
  });

  it('23:59 的记录保持 1 分钟，校验允许开始等于结束', async () => {
    const wrapper = mountForm(1439, 1439);
    const minutes = wrapper.findAllComponents(InputNumber)[1]!;
    minutes.vm.$emit('update:value', 30);
    await wrapper.vm.$nextTick();
    expect(getEndTimeValue(wrapper)).toBe('23:59');
    expect(minutes.props('value')).toBe(1);
    const rules = wrapper.findComponent(Form).props('rules')?.endTime;
    const rule = Array.isArray(rules)
      ? rules.find((item) => item.validator)
      : rules;
    if (!rule?.validator) throw new Error('缺少结束时间校验');
    await expect(
      rule.validator(rule, undefined, () => {}),
    ).resolves.toBeUndefined();
    wrapper.unmount();
  });

  it('输入时长不会占用下一条记录的开始分钟', async () => {
    const wrapper = mountForm(540, 540, [
      {
        id: 'next',
        date: '2026-09-12',
        categoryId: 'read',
        startTime: 570,
        endTime: 599,
      },
    ]);
    const minutes = wrapper.findAllComponents(InputNumber)[1]!;
    minutes.vm.$emit('update:value', 45);
    await wrapper.vm.$nextTick();
    expect(getEndTimeValue(wrapper)).toBe('09:29');
    expect(minutes.props('value')).toBe(30);
    wrapper.unmount();
  });
});
