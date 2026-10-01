/* eslint-disable vue/one-component-per-file -- Mock form and button for shared profile behavior. */
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import BaseSetting from '../base-setting.vue';
import PasswordSetting from '../password-setting.vue';

const formApi = vi.hoisted(() => ({ validate: vi.fn(), getValues: vi.fn() }));
vi.mock('@vben-core/form-ui', () => ({
  useVbenForm: () => [
    defineComponent({
      setup: () => () => h('form', [h('input'), h('textarea')]),
    }),
    formApi,
  ],
}));
vi.mock('@vben-core/shadcn-ui', () => ({
  VbenButton: defineComponent({
    setup:
      (_, { slots }) =>
      () =>
        h('button', slots.default?.()),
  }),
}));

beforeEach(() => {
  formApi.validate.mockReset().mockResolvedValue({ valid: true });
  formApi.getValues.mockReset().mockResolvedValue({ value: 'saved' });
});

describe.each([BaseSetting, PasswordSetting])(
  'profile Enter submission',
  (component) => {
    it('validates and submits single-line fields, preserving multiline input and IME', async () => {
      const wrapper = mount(component);
      await wrapper.find('textarea').trigger('keydown', { key: 'Enter' });
      await wrapper
        .find('input')
        .trigger('keydown', { key: 'Enter', isComposing: true });
      expect(formApi.validate).not.toHaveBeenCalled();
      await wrapper.find('input').trigger('keydown', { key: 'Enter' });
      await flushPromises();
      expect(wrapper.emitted('submit')).toEqual([[{ value: 'saved' }]]);
      wrapper.unmount();
    });

    it('does not persist invalid or loading forms', async () => {
      const wrapper = mount(component, { props: { loading: true } });
      await wrapper.find('input').trigger('keydown', { key: 'Enter' });
      expect(formApi.validate).not.toHaveBeenCalled();
      await wrapper.setProps({ loading: false });
      formApi.validate.mockResolvedValue({ valid: false });
      await wrapper.find('input').trigger('keydown', { key: 'Enter' });
      await flushPromises();
      expect(wrapper.emitted('submit')).toBeUndefined();
      wrapper.unmount();
    });
  },
);
