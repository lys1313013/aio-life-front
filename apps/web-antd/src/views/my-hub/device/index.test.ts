import { flushPromises, shallowMount } from '@vue/test-utils';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import DevicePage from './index.vue';

const api = vi.hoisted(() => ({ query: vi.fn(), deleteData: vi.fn() }));
vi.mock('#/api/core/device', () => ({ ...api, getDevice: vi.fn() }));
vi.mock('#/api/core/common', () => ({
  getByDictType: vi.fn().mockResolvedValue({ dictDetailList: [] }),
}));
vi.mock('#/api/core/userDictType', () => ({
  getByDictType: vi.fn().mockResolvedValue({
    dictDetailList: [
      { id: '81', dictLabel: '电脑' },
      { id: '82', dictLabel: '鼠标' },
      { id: '83', dictLabel: '阅读器' },
    ],
  }),
}));
vi.mock('../composables/useRecordDeepLink', () => ({
  useRecordDeepLink: () => ({}),
}));
vi.mock('./DeviceEditorModal.vue', () => ({
  default: { template: '<div />' },
}));
vi.mock('#/components/global-float-btn/index.vue', () => ({
  default: { template: '<div />' },
}));
vi.mock('#/utils/file', () => ({ fetchAuthImageUrl: vi.fn() }));

const wrappers: ReturnType<typeof shallowMount>[] = [];
const device = (id: string, type = '81') => ({
  id,
  type,
  name: '模拟设备',
  status: '1',
  purchasePrice: 100,
  purchaseDate: '2026-10-01',
});
async function render() {
  const wrapper = shallowMount(DevicePage);
  wrappers.push(wrapper);
  await flushPromises();
  return wrapper.vm;
}
beforeEach(() => vi.clearAllMocks());
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()));

describe('设备分类与完整列表', () => {
  it('保留后续页出现的分类，过滤空分类，切换时不丢失其他分类', async () => {
    const items = Array.from({ length: 201 }, (_, index) =>
      device(
        String(9_223_372_036_854_775_807n - BigInt(index)),
        index === 200 ? '82' : '81',
      ),
    );
    api.query.mockImplementation(async ({ page, pageSize }) => ({
      items: items.slice((page - 1) * pageSize, page * pageSize),
      total: items.length,
    }));
    const vm = await render();
    expect(api.query.mock.calls).toEqual([
      [{ page: 1, pageSize: 200 }],
      [{ page: 2, pageSize: 200 }],
    ]);
    expect(vm.tabList.map((tab) => tab.key)).toEqual(['', '81', '82']);
    vm.onTabChange('82');
    expect(vm.electronics.map((item) => item.id)).toEqual([items[200]!.id]);
    expect(vm.totalCount).toBe(1);
    expect(vm.totalAmt).toBe('100.00');
    expect(vm.tabList.map((tab) => tab.key)).toEqual(['', '81', '82']);
    expect(api.query).toHaveBeenCalledTimes(2);
  });

  it('删除分类最后一条后隐藏该分类并回到全部，新增分类数据后自动显示', async () => {
    const computer = device('9223372036854775807');
    const mouse = device('9223372036854775806', '82');
    api.query.mockResolvedValue({ items: [computer, mouse], total: 2 });
    api.deleteData.mockResolvedValue(undefined);
    const vm = await render();
    vm.onTabChange('82');
    api.query.mockResolvedValue({ items: [computer], total: 1 });
    await vm.handleDelete(mouse);
    expect(vm.tabKey).toBe('');
    expect(vm.tabList.map((tab) => tab.key)).toEqual(['', '81']);
    api.query.mockResolvedValue({ items: [computer, mouse], total: 2 });
    await vm.query();
    expect(vm.tabList.map((tab) => tab.key)).toEqual(['', '81', '82']);
  });

  it('空列表只显示全部；后续页失败保留已有列表和分类', async () => {
    api.query.mockResolvedValue({ items: [], total: 0 });
    const vm = await render();
    expect(vm.tabList).toEqual([{ key: '', tab: '全部' }]);
    const saved = device('9223372036854775807', '82');
    api.query.mockResolvedValue({ items: [saved], total: 1 });
    await vm.query();
    vm.onTabChange('82');
    api.query
      .mockResolvedValueOnce({
        items: Array.from({ length: 200 }, (_, i) => device(String(i))),
        total: 201,
      })
      .mockRejectedValueOnce(new Error('network error'));
    await expect(vm.query()).rejects.toThrow('network error');
    expect(vm.electronics.map((item) => item.id)).toEqual([saved.id]);
    expect(vm.tabList.map((tab) => tab.key)).toEqual(['', '82']);
    expect(vm.listLoading).toBe(false);
  });
});
