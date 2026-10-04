import { reactive } from 'vue';

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useHomeCardsStore } from './home-cards';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  toggle: vi.fn(),
  order: vi.fn(),
  reset: vi.fn(),
  user: { userInfo: { id: 'A' } },
}));
vi.mock('@vben/stores', () => ({ useUserStore: () => mocks.user }));
vi.mock('#/api/core/home-cards', () => ({
  getHomeCards: mocks.get,
  toggleHomeCard: mocks.toggle,
  orderHomeCards: mocks.order,
  resetHomeCards: mocks.reset,
}));
const items = [
  {
    cardKey: 'section.goal',
    group: 'section',
    title: '目标',
    icon: 'lucide:crosshair',
    enabled: true,
    sortOrder: 0,
  },
];
beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
  mocks.user = reactive({ userInfo: { id: 'A' } });
  mocks.get.mockResolvedValue(items);
});
describe('首页卡片偏好', () => {
  it('读取失败禁止写入，重试后恢复', async () => {
    const store = useHomeCardsStore();
    mocks.get.mockRejectedValueOnce(new Error('network'));
    await store.load();
    expect(store.ready).toBe(false);
    expect(await store.toggle('section.goal', false)).toBe(false);
    expect(mocks.toggle).not.toHaveBeenCalled();
    await store.load();
    expect(store.enabled('section.goal')).toBe(true);
  });
  it('账号切换丢弃迟到读取且清除旧偏好', async () => {
    let finish!: (value: typeof items) => void;
    mocks.get.mockReturnValueOnce(
      new Promise((done) => {
        finish = done;
      }),
    );
    const store = useHomeCardsStore();
    const run = store.load();
    mocks.user.userInfo.id = 'B';
    finish(items);
    await run;
    expect(store.ready).toBe(false);
    expect(store.items).toEqual([]);
  });
  it('失败保留旧值，请求期间禁止重复写入', async () => {
    const store = useHomeCardsStore();
    await store.load();
    let fail!: (reason: Error) => void;
    mocks.toggle.mockReturnValueOnce(
      new Promise((_, reject) => {
        fail = reject;
      }),
    );
    const saving = store.toggle('section.goal', false);
    expect(store.busy).toBe('section.goal');
    expect(await store.reorder('section', ['section.goal'])).toBe(false);
    fail(new Error('network'));
    await expect(saving).rejects.toThrow();
    expect(store.enabled('section.goal')).toBe(true);
    expect(store.busy).toBe('');
  });
});
