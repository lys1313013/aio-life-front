import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import BusinessCards from './BusinessCards.vue';
import BusinessListCard from './BusinessListCard.vue';

const mocks = vi.hoisted(() => ({
  memberships: vi.fn(),
  readPage: vi.fn(),
  moviePage: vi.fn(),
  readUpdate: vi.fn(),
  movieUpdate: vi.fn(),
}));
vi.mock('@vben/stores', () => ({
  useAccessStore: () => ({
    accessMenus: [
      { path: '/membership', menuId: '4', icon: 'ant-design:gift-outlined' },
      {
        path: '/record',
        menuId: '1',
        children: [
          {
            path: '/record/read',
            menuId: '2',
            icon: 'lucide:book-open',
            iconColor: '#5c91ab',
          },
          { path: '/record/movie', menuId: '3', icon: 'lucide:clapperboard' },
        ],
      },
    ],
    loginExpired: false,
  }),
  useUserStore: () => ({ userInfo: { id: '9007199254740993' } }),
}));
vi.mock('#/store/secondary-lock', () => ({
  useSecondaryLockStore: () => ({
    loaded: true,
    isMenuLocked: () => false,
    isUnlocked: () => false,
    unlockedPaths: new Set(),
    loadLockedMenus: vi.fn(),
    triggerUnlock: vi.fn(),
  }),
}));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@vben/common-ui', () => ({ VbenIcon: { template: '<i />' } }));
vi.mock('@vben/icons', () => ({ IconifyIcon: { template: '<i />' } }));
vi.mock('ant-design-vue', () => {
  const wrapper = { template: '<div><slot /></div>' };
  return {
    Dropdown: wrapper,
    Menu: wrapper,
    MenuItem: wrapper,
    Button: wrapper,
    Input: wrapper,
    Tooltip: wrapper,
    Upload: wrapper,
    message: { success: vi.fn() },
  };
});
vi.mock('#/components/app-modal', () => ({
  AppModal: { props: ['open'], template: '<div v-if="open"><slot /></div>' },
  AppModalDelete: { template: '<div />' },
  AppModalFooter: {
    emits: ['confirm', 'cancel'],
    template: '<button data-save @click="$emit(\'confirm\')">保存</button>',
  },
}));
vi.mock('#/adapter/form', async () => {
  const { reactive, defineComponent, h } = await import('vue');
  return {
    useAppForm: () => {
      const values = reactive<Record<string, unknown>>({});
      return [
        defineComponent({
          setup: () => () =>
            h(
              'select',
              {
                'aria-label': '状态',
                value: values.status,
                onChange: (event: Event) => {
                  values.status = (event.target as HTMLSelectElement).value;
                },
              },
              ['not_started', 'in_progress', 'completed'].map((value) =>
                h('option', { value }, value),
              ),
            ),
        }),
        {
          setValues: (row: Record<string, unknown>) =>
            Object.assign(values, row),
          resetForm: vi.fn(),
          validate: async () => ({ valid: true }),
          getValues: async () => ({ ...values }),
        },
      ];
    },
  };
});
vi.mock('#/utils/file', () => ({ fetchAuthImageUrl: vi.fn() }));
vi.mock('./BusinessCardCover.vue', () => ({
  default: { template: '<span />' },
}));
vi.mock('#/api/core/goal', () => ({
  getGoalList: async () => [],
  setGoalPinned: vi.fn(),
  updateGoalPinnedOrder: vi.fn(),
}));
vi.mock('#/api/my-hub/anniversary', () => ({
  getAnniversaryRecords: async () => [],
  setAnniversaryPinned: vi.fn(),
  updateAnniversaryPinnedOrder: vi.fn(),
}));
vi.mock('#/api/membership', () => ({ queryMemberships: mocks.memberships }));
vi.mock('#/api/readRecord', () => ({
  ReadRecordApi: {
    pageList: mocks.readPage,
    update: mocks.readUpdate,
    save: vi.fn(),
    remove: vi.fn(),
  },
}));
vi.mock('#/api/movie', () => ({
  MovieApi: {
    pageList: mocks.moviePage,
    update: mocks.movieUpdate,
    save: vi.fn(),
    remove: vi.fn(),
  },
}));
enableAutoUnmount(afterEach);

const read = {
  id: '9007199254740994',
  title: '首页阅读',
  type: 1,
  status: 'in_progress',
  author: '作者',
  url: '',
  currentProgress: 30,
  totalProgress: 100,
  remark: '原有书评',
};
const movie = {
  id: '9007199254740995',
  title: '首页观影',
  type: 2,
  status: 'in_progress',
  director: '导演',
  url: '',
  currentProgress: 3,
  totalProgress: 10,
  remark: '原有短评',
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.memberships.mockResolvedValue([]);
  mocks.readPage.mockResolvedValue({ items: [read], total: '1' });
  mocks.moviePage.mockResolvedValue({ items: [movie], total: '1' });
  mocks.readUpdate.mockImplementation(async () => {
    mocks.readPage.mockResolvedValue({ items: [], total: '0' });
  });
  mocks.movieUpdate.mockImplementation(async () => {
    mocks.moviePage.mockResolvedValue({ items: [], total: '0' });
  });
});
describe('首页复用阅读观影编辑器闭环', () => {
  it.each([
    ['阅读', '首页阅读', mocks.readPage, mocks.readUpdate, read],
    ['观影', '首页观影', mocks.moviePage, mocks.movieUpdate, movie],
  ] as const)(
    '%s 在首页修改为完成，保存原字段并自动移出对应卡片',
    async (label, title, page, update, record) => {
      const wrapper = mount(BusinessCards);
      await flushPromises();
      expect(page).toHaveBeenCalledWith({
        activeOnly: true,
        inProgressFirst: true,
        current: 1,
        size: 20,
      });
      await wrapper
        .findAll('.line-clamp-2')
        .find((node) => node.text() === title)!
        .trigger('click');
      await vi.waitFor(() =>
        expect(wrapper.find('select[aria-label="状态"]').exists()).toBe(true),
      );
      await wrapper.get('select[aria-label="状态"]').setValue('completed');
      await wrapper.get('[data-save]').trigger('click');
      await flushPromises();
      expect(update).toHaveBeenCalledWith({ ...record, status: 'completed' });
      expect(wrapper.find(`section[aria-label="${label}"]`).exists()).toBe(
        false,
      );
      const remaining = label === '阅读' ? '观影' : '阅读';
      expect(wrapper.find(`section[aria-label="${remaining}"]`).exists()).toBe(
        true,
      );
    },
  );
});

describe('首页卡片显示规则', () => {
  it('复用各自菜单图标与颜色，阅读和观影隐藏进度但保留状态', async () => {
    const wrapper = mount(BusinessCards);
    await flushPromises();
    const cards = wrapper.findAllComponents(BusinessListCard);
    expect(
      cards.find((card) => card.props('title') === '阅读')?.props(),
    ).toMatchObject({ icon: 'lucide:book-open', iconColor: '#5c91ab' });
    expect(
      cards.find((card) => card.props('title') === '观影')?.props('icon'),
    ).toBe('lucide:clapperboard');
    expect(
      cards.find((card) => card.props('title') === '会员')?.props('icon'),
    ).toBe('ant-design:gift-outlined');
    expect(
      cards.find((card) => card.props('title') === '阅读')?.props('media'),
    ).toBe(true);
    expect(
      cards.find((card) => card.props('title') === '观影')?.props('media'),
    ).toBe(true);
    expect(
      cards.find((card) => card.props('title') === '会员')?.props('media'),
    ).toBe(false);
    expect(wrapper.text()).toContain('在读');
    expect(wrapper.text()).toContain('在看');
    expect(wrapper.text()).not.toContain('30 / 100');
    expect(wrapper.text()).not.toContain('3 / 10');
  });
  it('首页会员不展示已过期记录，全部过期时隐藏卡片', async () => {
    const expired = {
      id: '1',
      name: '已过期会员',
      expiryDate: '2000-01-01',
      status: 'expired',
    };
    mocks.memberships.mockResolvedValue([
      expired,
      { id: '2', name: '有效会员', expiryDate: '2099-01-01', status: 'active' },
    ]);
    const wrapper = mount(BusinessCards);
    await flushPromises();
    expect(wrapper.text()).toContain('有效会员');
    expect(wrapper.text()).not.toContain('已过期会员');
    mocks.memberships.mockResolvedValue([expired]);
    await wrapper.get('[aria-label="刷新会员"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('section[aria-label="会员"]').exists()).toBe(false);
  });
});
