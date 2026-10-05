/* eslint-disable vue/one-component-per-file -- Lightweight controls isolate membership editor behavior. */
import type { MembershipVO } from '#/api/membership';

import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';

import dayjs from 'dayjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import MembershipFormModal from './form-modal.vue';

const api = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  validate: vi.fn(),
  providers: vi.fn(),
  clearValidate: vi.fn(),
}));
vi.mock('#/api/membership', () => ({
  createMembership: api.create,
  updateMembership: api.update,
  deleteMembership: api.remove,
}));
vi.mock('#/api/membership/providers', () => ({
  queryMembershipProviders: api.providers,
  membershipProviderIconUrl: (key: string) =>
    `/api/membership/provider-icons/${key}`,
}));
vi.mock('@vben/icons', () => ({ IconifyIcon: { template: '<i />' } }));
vi.mock('@vben/preferences', () => ({
  usePreferences: () => ({ isMobile: false, isDark: { value: false } }),
}));
vi.mock('#/components/app-modal', () => ({
  AppModal: defineComponent({
    name: 'EditorModal',
    props: { open: Boolean, confirmLoading: Boolean },
    emits: ['ok', 'update:open'],
    setup:
      (_, { slots }) =>
      () =>
        h('section', [slots.default?.(), slots['footer-leading']?.()]),
  }),
  AppModalDelete: defineComponent({
    name: 'EditorDelete',
    props: { action: { type: Function, required: true }, disabled: Boolean },
    setup: (props) => () =>
      h('button', { onClick: props.action, 'data-delete': '' }, '删除'),
  }),
}));
vi.mock('ant-design-vue', () => {
  const control = (name: string) =>
    defineComponent({
      name,
      props: {
        value: { type: null, default: undefined },
        checked: Boolean,
        name: { type: String, default: '' },
        label: { type: String, default: '' },
      },
      emits: ['update:value', 'update:checked', 'change'],
      setup:
        (_, { slots }) =>
        () =>
          h('div', slots.default?.()),
    });
  return {
    Form: defineComponent({
      name: 'EditorForm',
      props: {
        model: { type: Object, required: true },
        rules: { type: Object, required: true },
      },
      setup: (_, { expose, slots }) => {
        expose({ validate: api.validate, clearValidate: api.clearValidate });
        return () => h('form', slots.default?.());
      },
    }),
    FormItem: control('EditorField'),
    Input: control('EditorInput'),
    Button: defineComponent({
      name: 'EditorButton',
      setup:
        (_, { slots, attrs }) =>
        () =>
          h('button', attrs, slots.default?.()),
    }),
    InputNumber: control('EditorNumber'),
    DatePicker: control('EditorDate'),
    Select: control('EditorSelect'),
    SelectOption: control('EditorOption'),
    Switch: control('EditorSwitch'),
    Textarea: control('EditorTextarea'),
    message: { success: vi.fn() },
  };
});
enableAutoUnmount(afterEach);
beforeEach(() => {
  vi.clearAllMocks();
  api.validate.mockResolvedValue(undefined);
  api.providers.mockResolvedValue([]);
});

const existing: MembershipVO = {
  id: '900719925474099399',
  name: '家庭云盘',
  category: 'cloud',
  provider: '家庭服务商',
  color: '#722ed1',
  startDate: '2026-01-01',
  expiryDate: '2027-01-01',
  price: 120,
  billingCycle: 'year',
  monthlyAmount: 8,
  autoRenew: 1,
  note: '自定义月均金额需要保留',
  status: 'active',
  remainingDays: 89,
};
function render(values?: MembershipVO) {
  return mount(MembershipFormModal, { props: { open: true, values } });
}
function submit(wrapper: ReturnType<typeof render>) {
  wrapper.findComponent({ name: 'EditorModal' }).vm.$emit('ok');
}

describe('会员共享编辑器', () => {
  it('未选分类时选择平台自动带入分类，切换到其他分类清除关联', async () => {
    const provider = {
      id: '900719925474099401',
      name: '腾讯视频',
      code: 'tencent_video',
      category: 'video',
      iconKey: 'tencent-video',
      sortOrder: 0,
      isEnabled: 1,
    };
    api.providers.mockResolvedValue([provider]);
    api.update.mockResolvedValue(existing);
    const wrapper = render({ ...existing, category: undefined });
    await flushPromises();
    const selector = wrapper.findAllComponents({ name: 'EditorSelect' })[1]!;
    selector.vm.$emit('update:value', provider.id);
    selector.vm.$emit('change', provider.id);
    await flushPromises();
    const model = wrapper.findComponent({ name: 'EditorForm' }).props('model');
    expect(model).toMatchObject({
      providerId: provider.id,
      provider: provider.name,
      category: 'video',
    });
    const categorySelector = wrapper.findAllComponents({
      name: 'EditorSelect',
    })[0]!;
    categorySelector.vm.$emit('update:value', 'study');
    categorySelector.vm.$emit('change', 'study');
    submit(wrapper);
    await flushPromises();
    expect(api.update).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: null,
        category: 'study',
        provider: undefined,
      }),
    );
  });

  it('选择AI分类只显示AI平台，切换分类保留自定义文本且空分类显示全部', async () => {
    const ai = {
      id: '900719925474099403',
      name: 'Claude',
      code: 'claude',
      category: 'AI',
      iconKey: null,
      sortOrder: 1,
      isEnabled: 1,
    };
    const video = {
      ...ai,
      id: '900719925474099404',
      name: '腾讯视频',
      code: 'tencent_video',
      category: 'video',
    };
    api.providers.mockResolvedValue([ai, video]);
    const wrapper = render({ ...existing, category: 'AI' });
    await flushPromises();
    const optionIds = () =>
      wrapper
        .findAllComponents({ name: 'EditorOption' })
        .map((option) => option.props('value'));
    expect(optionIds()).toContain(ai.id);
    expect(optionIds()).not.toContain(video.id);
    const categorySelector = wrapper.findAllComponents({
      name: 'EditorSelect',
    })[0]!;
    categorySelector.vm.$emit('update:value', 'video');
    categorySelector.vm.$emit('change', 'video');
    await flushPromises();
    expect(optionIds()).toContain(video.id);
    expect(optionIds()).not.toContain(ai.id);
    expect(
      wrapper.findComponent({ name: 'EditorForm' }).props('model').provider,
    ).toBe(existing.provider);
    categorySelector.vm.$emit('update:value', undefined);
    categorySelector.vm.$emit('change', undefined);
    await flushPromises();
    expect(optionIds()).toEqual(expect.arrayContaining([ai.id, video.id]));
  });

  it('已停用的平台保留关联，清空后按自定义平台保存', async () => {
    const record = {
      ...existing,
      providerId: '900719925474099402',
      providerName: '已停用平台',
    };
    api.update.mockResolvedValue(record);
    const wrapper = render(record);
    await flushPromises();
    const option = wrapper
      .findAllComponents({ name: 'EditorOption' })
      .find((item) => item.props('value') === record.providerId)!;
    expect(option.attributes('disabled')).toBeDefined();
    submit(wrapper);
    await flushPromises();
    expect(api.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ providerId: record.providerId }),
    );
    const selector = wrapper.findAllComponents({ name: 'EditorSelect' })[1]!;
    selector.vm.$emit('update:value', undefined);
    selector.vm.$emit('change', undefined);
    await flushPromises();
    submit(wrapper);
    await flushPromises();
    expect(api.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        providerId: null,
        provider: existing.provider,
      }),
    );
  });

  it('平台加载失败显示重试，重试成功恢复选项', async () => {
    api.providers
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce([]);
    const wrapper = render(existing);
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toContain('平台加载失败');
    await wrapper.get('[role="alert"] button').trigger('click');
    await flushPromises();
    expect(api.providers).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it('已有记录完整回填并原样提交所有编辑字段，发出服务端保存结果', async () => {
    const saved = { ...existing, remainingDays: 88 };
    api.update.mockResolvedValue(saved);
    const wrapper = render(existing);
    await flushPromises();
    const model = wrapper.findComponent({ name: 'EditorForm' }).props('model');
    expect(model).toMatchObject({
      id: existing.id,
      name: existing.name,
      category: existing.category,
      provider: existing.provider,
      color: existing.color,
      price: 120,
      billingCycle: 'year',
      monthlyAmount: 8,
      autoRenew: true,
      note: existing.note,
    });
    expect(model.startDate.format('YYYY-MM-DD')).toBe(existing.startDate);
    expect(model.expiryDate.format('YYYY-MM-DD')).toBe(existing.expiryDate);
    expect(
      wrapper
        .findAllComponents({ name: 'EditorField' })
        .map((field) => field.props('name')),
    ).toEqual([
      'name',
      'category',
      'providerId',
      'provider',
      'startDate',
      'expiryDate',
      'price',
      'billingCycle',
      'monthlyAmount',
      'color',
      'autoRenew',
      'note',
    ]);
    submit(wrapper);
    await flushPromises();
    const { remainingDays: _days, status: _status, ...expected } = existing;
    expect(api.update).toHaveBeenCalledExactlyOnceWith({
      ...expected,
      providerId: null,
    });
    expect(api.create).not.toHaveBeenCalled();
    expect(wrapper.emitted('saved')).toEqual([[saved]]);
    expect(wrapper.emitted('update:open')).toEqual([[false]]);
  });

  it('重新打开新增时清除旧记录，日期快捷操作和月均计算仍有效', async () => {
    const wrapper = render(existing);
    await wrapper.setProps({ open: false });
    await wrapper.setProps({ open: true, values: undefined });
    await flushPromises();
    expect(
      wrapper.findComponent({ name: 'EditorForm' }).props('model'),
    ).toMatchObject({ name: '', billingCycle: 'month', autoRenew: false });
    expect(wrapper.findComponent({ name: 'EditorDelete' }).exists()).toBe(
      false,
    );
    wrapper
      .findAllComponents({ name: 'EditorInput' })[0]!
      .vm.$emit('update:value', '新会员');
    wrapper
      .findAllComponents({ name: 'EditorDate' })[0]!
      .vm.$emit('update:value', dayjs('2026-03-01'));
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '1年')!
      .trigger('click');
    const price = wrapper.findAllComponents({ name: 'EditorNumber' })[0]!;
    price.vm.$emit('update:value', 120);
    wrapper
      .findAllComponents({ name: 'EditorSelect' })[2]!
      .vm.$emit('update:value', 'year');
    price.vm.$emit('change', 120);
    const saved = { ...existing, id: '900719925474099400', name: '新会员' };
    api.create.mockResolvedValue(saved);
    submit(wrapper);
    await flushPromises();
    expect(api.create).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        id: undefined,
        name: '新会员',
        category: 'other',
        startDate: '2026-03-01',
        expiryDate: '2027-03-01',
        price: 120,
        billingCycle: 'year',
        monthlyAmount: 10,
        autoRenew: 0,
      }),
    );
    expect(api.update).not.toHaveBeenCalled();
    expect(wrapper.emitted('saved')).toEqual([[saved]]);
    expect(api.clearValidate).toHaveBeenCalledTimes(2);
  });

  it('保存请求未结束时不重复提交，失败保留弹窗与编辑内容', async () => {
    let reject!: (error: Error) => void;
    api.update.mockReturnValue(
      new Promise((_, fail) => {
        reject = fail;
      }),
    );
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrapper = render(existing);
    submit(wrapper);
    submit(wrapper);
    await flushPromises();
    expect(api.update).toHaveBeenCalledTimes(1);
    expect(
      wrapper.findComponent({ name: 'EditorModal' }).props('confirmLoading'),
    ).toBe(true);
    reject(new Error('offline'));
    await flushPromises();
    expect(wrapper.emitted('saved')).toBeUndefined();
    expect(wrapper.emitted('update:open')).toBeUndefined();
    expect(
      wrapper.findComponent({ name: 'EditorForm' }).props('model').name,
    ).toBe(existing.name);
    expect(
      wrapper.findComponent({ name: 'EditorModal' }).props('confirmLoading'),
    ).toBe(false);
    log.mockRestore();
  });

  it('删除使用字符串 ID 并发出删除事件、关闭弹窗', async () => {
    api.remove.mockResolvedValue(undefined);
    const wrapper = render(existing);
    await wrapper.get('[data-delete]').trigger('click');
    await flushPromises();
    expect(api.remove).toHaveBeenCalledExactlyOnceWith(existing.id);
    expect(wrapper.emitted('deleted')).toEqual([[existing.id]]);
    expect(wrapper.emitted('saved')).toBeUndefined();
    expect(wrapper.emitted('update:open')).toEqual([[false]]);
  });
});
