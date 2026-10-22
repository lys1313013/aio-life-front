import { mount } from '@vue/test-utils';

import { expect, it, vi } from 'vitest';

import FinancialPeriodSelector from './FinancialPeriodSelector.vue';

vi.mock('@vben/common-ui', () => ({ VbenIcon: { template: '<i />' } }));
it('待请求范围只显示loading，选中状态与已展示数据的范围一致', async () => {
  const wrapper = mount(FinancialPeriodSelector, {
    props: { title: '收入', value: 'month', pending: 'year', loading: true },
  });
  expect(
    wrapper.get('[aria-label="收入范围：本月"]').attributes('aria-pressed'),
  ).toBe('true');
  expect(
    wrapper.get('[aria-label="收入范围：本年"]').attributes('aria-pressed'),
  ).toBe('false');
  expect(
    wrapper.get('[aria-label="收入范围：本年"]').attributes('aria-busy'),
  ).toBe('true');
  await wrapper.get('[aria-label="收入范围：全部"]').trigger('click');
  expect(wrapper.emitted('select')).toEqual([['all']]);
  await wrapper.setProps({ value: 'all', pending: 'all', loading: false });
  expect(
    wrapper.get('[aria-label="收入范围：全部"]').attributes('aria-pressed'),
  ).toBe('true');
  wrapper.unmount();
});
