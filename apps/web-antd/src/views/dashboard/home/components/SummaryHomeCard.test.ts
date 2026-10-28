import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import SummaryHomeCard from './SummaryHomeCard.vue';

const mocks = vi.hoisted(() => ({ push: vi.fn(), load: vi.fn() }));
const data = ref<any>(null);
const identity = ref('one');
const locked = ref(false);
vi.mock('#/api/core/home-sections', () => ({
  isFinancialSection: (kind: string) =>
    ['expense', 'finance', 'income'].includes(kind),
}));
vi.mock('./SummaryMediaThumbnail.vue', () => ({
  default: { template: '<i />' },
}));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@vben/common-ui', () => ({ VbenIcon: { template: '<i />' } }));
vi.mock('#/components/BusinessIcon.vue', () => ({
  default: { template: '<i />' },
}));
vi.mock('#/composables/useBusinessSection', () => ({
  useBusinessSection: (kind: string) => ({
    data,
    loaded: ref(true),
    loading: ref(false),
    failed: ref(false),
    available: ref(true),
    locked,
    path: ref(`/${kind}`),
    identity,
    period: ref('month'),
    displayedPeriod: ref('month'),
    selectPeriod: vi.fn(),
    load: mocks.load,
  }),
}));
vi.mock('#/views/my-hub/memo/MemoEditorModal.vue', () => ({
  __esModule: true,
  default: {
    props: ['memoId'],
    template: '<div data-editor :data-id="memoId" />',
  },
}));
vi.mock('#/components/finance-entry/FinanceEntryModal.vue', () => ({
  __esModule: true,
  default: { template: '<div />' },
}));
vi.mock('#/views/my-hub/device/DeviceEditorModal.vue', () => ({
  __esModule: true,
  default: {
    props: ['deviceId'],
    template: '<div data-device-editor :data-id="deviceId" />',
  },
}));
enableAutoUnmount(afterEach);
beforeEach(() => {
  mocks.push.mockClear();
  mocks.load.mockClear();
  identity.value = 'one';
  locked.value = false;
});
it('笔记仅显示标题和日期，以字符串 ID 加载编辑器；切换身份销毁编辑器', async () => {
  data.value = {
    items: [
      {
        id: '9007199254740993123',
        title: '隐藏笔记',
        hiddenContent: true,
        content: '不得泄漏',
        updateTime: '2026-10-22T12:00:00',
      },
    ],
  };
  const wrapper = mount(SummaryHomeCard, { props: { kind: 'memo' } });
  expect(wrapper.text()).not.toContain('不得泄漏');
  await wrapper.get('[aria-label="编辑笔记：隐藏笔记"]').trigger('click');
  await flushPromises();
  expect(wrapper.get('[data-editor]').attributes('data-id')).toBe(
    '9007199254740993123',
  );
  identity.value = 'two';
  await flushPromises();
  expect(wrapper.find('[data-editor]').exists()).toBe(false);
});
it('财务显示零与负结余，不将零当空数据', () => {
  data.value = { month: '2026-10', income: 0, expense: 10, balance: -10 };
  const wrapper = mount(SummaryHomeCard, { props: { kind: 'finance' } });
  expect(wrapper.text()).toContain('0.00');
  expect(wrapper.text()).toContain('-10.00');
});
it('视频只使用可信 B站链接；非法链接定位记录，不执行URL', async () => {
  data.value = {
    items: [
      {
        id: 'big-id',
        title: '合法',
        currentEpisode: 1,
        episodes: 2,
        progressPercent: 25,
        resumeUrl: 'https://www.bilibili.com/video/BV123?p=1&t=15',
      },
      {
        id: '9007199254740993',
        title: '无链接',
        currentEpisode: 1,
        episodes: 1,
        progressPercent: 0,
        resumeUrl: 'javascript:alert(1)',
      },
    ],
  };
  const wrapper = mount(SummaryHomeCard, { props: { kind: 'video' } });
  expect(wrapper.findAll('a')).toHaveLength(1);
  expect(wrapper.get('a').attributes('href')).toContain('t=15');
  await wrapper
    .findAll('button')
    .find((button) => button.text().includes('无链接'))!
    .trigger('click');
  expect(mocks.push).toHaveBeenCalledWith({
    path: '/video',
    query: { id: '9007199254740993' },
  });
});
it('设备条目在首页打开弹窗，标题仍导航，锁定后销毁编辑器', async () => {
  data.value = {
    items: [
      {
        id: '9007199254740993',
        name: '电脑',
        usageDays: null,
        dailyCost: null,
      },
    ],
  };
  const wrapper = mount(SummaryHomeCard, { props: { kind: 'device' } });
  expect(wrapper.text()).toContain('未填写购买日期');
  expect(wrapper.text()).toContain('— 元/天');
  await wrapper
    .findAll('button')
    .find((button) => button.text().includes('电脑'))!
    .trigger('click');
  await flushPromises();
  expect(mocks.push).not.toHaveBeenCalled();
  expect(wrapper.get('[data-device-editor]').attributes('data-id')).toBe(
    '9007199254740993',
  );
  locked.value = true;
  await flushPromises();
  expect(wrapper.find('[data-device-editor]').exists()).toBe(false);
  await wrapper
    .findAll('button')
    .find((button) => button.text() === '我的设备')!
    .trigger('click');
  expect(mocks.push).toHaveBeenCalledWith('/device');
});
