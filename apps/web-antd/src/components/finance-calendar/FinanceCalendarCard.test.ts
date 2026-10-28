import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import FinanceCalendarCard from '#/components/finance-calendar/FinanceCalendarCard.vue';

const mocks = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('#/api/core/finance-calendar', () => ({ getFinanceCalendar: vi.fn() }));
const data = ref<any>(null);
const loading = ref(false);
const locked = ref(false);
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@vben/stores', () => ({
  useUserStore: () => ({ userInfo: { userId: '9007199254740993' } }),
}));
vi.mock('@vben/common-ui', () => ({ VbenIcon: { template: '<i />' } }));
vi.mock('#/components/BusinessIcon.vue', () => ({
  default: { template: '<i />' },
}));
vi.mock('#/store/menu-visuals', () => ({
  useMenuVisualsStore: () => ({ visual: () => ({}) }),
}));
vi.mock('#/components/RefreshableCardHeader.vue', () => ({
  default: { template: '<header><slot /></header>' },
}));
vi.mock(
  '#/components/finance-calendar/FinanceCalendarDetailsModal.vue',
  () => ({
    default: {
      props: ['kind', 'bucket', 'initialKind'],
      template:
        '<div role="dialog" :data-kind="kind" :data-bucket="bucket.key" :data-initial-kind="initialKind" />',
    },
  }),
);
vi.mock('#/composables/useBusinessSection', () => ({
  useBusinessSection: (kind: string) => ({
    data,
    loading,
    locked,
    loaded: ref(true),
    failed: ref(false),
    available: ref(true),
    path: ref(`/${kind}`),
    load: mocks.load,
  }),
}));
enableAutoUnmount(afterEach);
beforeEach(() => {
  loading.value = false;
  locked.value = false;
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() });
  data.value = {
    granularity: 'week',
    date: '2026-08',
    label: '2026年8月',
    startDate: '2026-08-01',
    endDate: '2026-09-01',
    amount: 1234.56,
    buckets: [
      {
        key: 'first',
        label: '第1周',
        startDate: '2026-08-01',
        endDate: '2026-08-03',
        amount: 1234.56,
        future: false,
      },
    ],
  };
});
afterEach(() => vi.unstubAllGlobals());
it('收入只展示周月年，支出保留日；金额和格子使用相同结构', () => {
  const income = mount(FinanceCalendarCard, { props: { kind: 'income' } });
  const expense = mount(FinanceCalendarCard, { props: { kind: 'expense' } });
  expect(
    income
      .findAll('.finance-calendar-tabs button')
      .map((button) => button.text()),
  ).toEqual(['周', '月', '年']);
  expect(
    expense
      .findAll('.finance-calendar-tabs button')
      .map((button) => button.text()),
  ).toEqual(['日', '周', '月', '年']);
  expect(income.get('.finance-calendar-total').text()).toBe('1,234.56');
});
it('点击格子打开对应业务明细，卡片内不添加汇总行；锁定时关闭弹窗', async () => {
  const wrapper = mount(FinanceCalendarCard, { props: { kind: 'income' } });
  await wrapper.get('.finance-calendar-cell').trigger('click');
  expect(wrapper.get('[role="dialog"]').attributes('data-kind')).toBe('income');
  expect(wrapper.get('[role="dialog"]').attributes('data-bucket')).toBe(
    'first',
  );
  expect(wrapper.find('.finance-calendar-footer').exists()).toBe(false);
  locked.value = true;
  await flushPromises();
  expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
});
it('刷新保留金额和格子并显示局部loading，期间不打开旧范围明细', async () => {
  const wrapper = mount(FinanceCalendarCard, { props: { kind: 'expense' } });
  loading.value = true;
  await flushPromises();
  expect(wrapper.get('[role="status"]').attributes('aria-label')).toBe(
    '加载中',
  );
  expect(wrapper.get('.finance-calendar-total').text()).toBe('1,234.56');
  await wrapper.get('.finance-calendar-cell').trigger('click');
  expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
});

it('概览三项合计切换指标，结余为零但有收支时仍可打开明细', async () => {
  data.value = {
    ...data.value,
    income: 500,
    expense: 500,
    balance: 0,
    amount: 0,
    buckets: [
      {
        ...data.value.buckets[0],
        income: 500,
        expense: 500,
        balance: 0,
        amount: 0,
        future: true,
      },
    ],
  };
  const wrapper = mount(FinanceCalendarCard, { props: { kind: 'finance' } });
  expect(
    wrapper
      .findAll('.finance-calendar-tabs button')
      .map((button) => button.text()),
  ).toEqual(['周', '月', '年']);
  expect(wrapper.get('.finance-calendar-cell-amount').text()).toBe('0.00');
  expect(
    wrapper.get('.finance-calendar-cell').attributes('disabled'),
  ).toBeUndefined();
  await wrapper
    .findAll('.finance-calendar-metrics button')[0]!
    .trigger('click');
  expect(wrapper.get('.finance-calendar-cell-amount').text()).toBe('500.00');
  await wrapper.get('.finance-calendar-cell').trigger('click');
  expect(wrapper.get('[role="dialog"]').attributes('data-kind')).toBe(
    'finance',
  );
  expect(wrapper.get('[role="dialog"]').attributes('data-initial-kind')).toBe(
    'income',
  );
});
