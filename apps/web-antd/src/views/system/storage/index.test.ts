import { flushPromises, mount } from '@vue/test-utils';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import StoragePage from './index.vue';

const fixture = vi.hoisted(() => ({
  roles: ['admin'],
  queryStorageObjects: vi.fn(),
  readStorageObject: vi.fn(),
  deleteStorageObject: vi.fn(),
}));
vi.mock('#/api/system/storage', () => fixture);
vi.mock('@vben/stores', () => ({
  useUserStore: () => ({ userInfo: { roles: fixture.roles } }),
}));
vi.mock('@vben/common-ui', () => ({ VbenIcon: { template: '<span />' } }));
vi.mock('./StorageThumbnail.vue', () => ({ default: { template: '<div />' } }));
vi.mock('ant-design-vue', () => ({
  Alert: { props: ['message'], template: '<div>{{ message }}</div>' },
  Button: { template: '<button><slot /></button>' },
  Empty: { template: '<div>此路径下暂无文件</div>' },
  InputSearch: { template: '<input />' },
  Modal: { template: '<div />' },
  Popconfirm: {
    name: 'Popconfirm',
    emits: ['confirm'],
    template: '<div><slot /></div>',
  },
  Spin: { template: '<div><slot /></div>' },
}));

const first = {
  bucket: 'business',
  prefix: '',
  nextCursor: 'opaque+/=',
  items: [
    { key: '中文 +#/', directory: true, previewable: false, size: '0' },
    { key: 'photo.jpg', directory: false, previewable: true, size: '2048' },
  ],
};
const wrappers: ReturnType<typeof mount>[] = [];
async function render() {
  const wrapper = mount(StoragePage);
  wrappers.push(wrapper);
  await flushPromises();
  return wrapper;
}
beforeEach(() => {
  vi.clearAllMocks();
  fixture.roles = ['admin'];
  fixture.queryStorageObjects.mockImplementation(async () =>
    structuredClone(first),
  );
  fixture.deleteStorageObject.mockResolvedValue(undefined);
});
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()));

describe('对象存储浏览', () => {
  it('目录没有删除按钮，确认后只移除已成功删除的文件', async () => {
    const wrapper = await render();
    expect(wrapper.find('[aria-label="删除 中文 +#/"]').exists()).toBe(false);
    await wrapper.get('[aria-label="删除 photo.jpg"]').trigger('click');
    expect(fixture.deleteStorageObject).not.toHaveBeenCalled();
    wrapper.findComponent({ name: 'Popconfirm' }).vm.$emit('confirm');
    await flushPromises();
    expect(fixture.deleteStorageObject).toHaveBeenCalledWith('photo.jpg');
    expect(wrapper.text()).not.toContain('photo.jpg');
    expect(wrapper.text()).toContain('中文 +#/');
    expect(fixture.queryStorageObjects).toHaveBeenCalledTimes(1);
  });

  it('有关联或删除失败时保留原文件，后续可以重试', async () => {
    const wrapper = await render();
    fixture.deleteStorageObject.mockRejectedValueOnce(
      new Error('file 表存在关联'),
    );
    wrapper.findComponent({ name: 'Popconfirm' }).vm.$emit('confirm');
    await flushPromises();
    expect(wrapper.text()).toContain('photo.jpg');
    wrapper.findComponent({ name: 'Popconfirm' }).vm.$emit('confirm');
    await flushPromises();
    expect(wrapper.text()).not.toContain('photo.jpg');
    expect(fixture.deleteStorageObject).toHaveBeenCalledTimes(2);
  });

  it('删除进行中重复确认不重复发送请求', async () => {
    const wrapper = await render();
    let finish!: () => void;
    fixture.deleteStorageObject.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const confirm = wrapper.findComponent({ name: 'Popconfirm' });
    confirm.vm.$emit('confirm');
    confirm.vm.$emit('confirm');
    expect(fixture.deleteStorageObject).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('photo.jpg');
    finish();
    await flushPromises();
    expect(wrapper.text()).not.toContain('photo.jpg');
  });

  it('删除之前发出的旧列表请求不能重新显示已删除文件', async () => {
    const wrapper = await render();
    let finish!: (value: typeof first) => void;
    fixture.queryStorageObjects.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    await wrapper.get('[aria-label="刷新"]').trigger('click');
    wrapper.findComponent({ name: 'Popconfirm' }).vm.$emit('confirm');
    await flushPromises();
    finish(structuredClone(first));
    await flushPromises();
    expect(wrapper.text()).not.toContain('photo.jpg');
  });

  it('普通用户不发请求且没有文件入口', async () => {
    fixture.roles = ['user'];
    const wrapper = await render();
    expect(fixture.queryStorageObjects).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('仅管理员');
    expect(wrapper.find('article').exists()).toBe(false);
  });

  it('游标翻页失败保留数据，重试成功后可返回上一页', async () => {
    const wrapper = await render();
    expect(wrapper.text()).toContain('2.0 KB');
    fixture.queryStorageObjects.mockRejectedValueOnce(new Error('offline'));
    await wrapper.get('[aria-label="下一页"]').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('photo.jpg');
    expect(wrapper.text()).toContain('读取失败');
    expect(
      wrapper.get('[aria-label="上一页"]').attributes('disabled'),
    ).toBeDefined();
    fixture.queryStorageObjects.mockResolvedValueOnce({
      ...first,
      items: [],
      nextCursor: null,
    });
    await wrapper.get('[aria-label="下一页"]').trigger('click');
    await flushPromises();
    expect(fixture.queryStorageObjects).toHaveBeenLastCalledWith({
      prefix: '',
      cursor: 'opaque+/=',
      pageSize: 24,
    });
    expect(
      wrapper.get('[aria-label="下一页"]').attributes('disabled'),
    ).toBeDefined();
    await wrapper.get('[aria-label="上一页"]').trigger('click');
    await flushPromises();
    expect(fixture.queryStorageObjects).toHaveBeenLastCalledWith({
      prefix: '',
      cursor: undefined,
      pageSize: 24,
    });
  });

  it('进入目录保留原始中文和特殊字符并重置游标', async () => {
    const wrapper = await render();
    await wrapper.get('[aria-label="打开目录 中文 +#/"]').trigger('click');
    await flushPromises();
    expect(fixture.queryStorageObjects).toHaveBeenLastCalledWith({
      prefix: '中文 +#/',
      cursor: undefined,
      pageSize: 24,
    });
  });

  it('过期的请求不会覆盖最新目录结果', async () => {
    const wrapper = await render();
    let resolveOld!: (value: typeof first) => void;
    fixture.queryStorageObjects.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveOld = resolve;
      }),
    );
    await wrapper.get('[aria-label="刷新"]').trigger('click');
    fixture.queryStorageObjects.mockResolvedValueOnce({
      ...first,
      bucket: 'latest',
    });
    await wrapper.get('[aria-label="刷新"]').trigger('click');
    await flushPromises();
    resolveOld({ ...first, bucket: 'stale' });
    await flushPromises();
    expect(wrapper.text()).toContain('latest');
    expect(wrapper.text()).not.toContain('stale');
  });
});
