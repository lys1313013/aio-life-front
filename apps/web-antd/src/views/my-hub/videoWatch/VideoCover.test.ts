import { flushPromises, mount } from '@vue/test-utils';
import { reactive } from 'vue';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import VideoCover from './VideoCover.vue';

const mocks = vi.hoisted(() => ({ access: { accessToken: 'fixture-token' } }));
vi.mock('@vben/stores', () => ({ useAccessStore: () => mocks.access }));
vi.mock('#/utils/file', () => ({
  getFilePreviewUrl: (id: string) => '/api/file/preview/' + id,
}));
const wrappers: ReturnType<typeof mount>[] = [];
beforeEach(() => {
  mocks.access = reactive({ accessToken: 'fixture-token' });
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fixture');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});
afterEach(() => {
  wrappers.splice(0).forEach((w) => w.unmount());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it('封面通过内部文件接口携带鉴权加载，卸载释放图片', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue({ ok: true, blob: async () => new Blob(['fixture']) });
  vi.stubGlobal('fetch', fetch);
  const wrapper = mount(VideoCover, {
    props: { fileId: 'file-a', state: 'READY', title: '合成视频' },
  });
  wrappers.push(wrapper);
  await flushPromises();
  expect(fetch).toHaveBeenCalledWith(
    '/api/file/preview/file-a',
    expect.objectContaining({
      headers: { Authorization: 'Bearer fixture-token' },
    }),
  );
  expect(wrapper.get('img').attributes('src')).toBe('blob:fixture');
  wrapper.unmount();
  wrappers.pop();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fixture');
});
it('切换账号时丢弃旧响应，不生成可继续展示的旧图片', async () => {
  let resolve!: (value: unknown) => void;
  vi.stubGlobal(
    'fetch',
    vi.fn(
      () =>
        new Promise((ok) => {
          resolve = ok;
        }),
    ),
  );
  const wrapper = mount(VideoCover, {
    props: { fileId: 'file-a', title: '合成视频' },
  });
  wrappers.push(wrapper);
  mocks.access.accessToken = '';
  await flushPromises();
  resolve({ ok: true, blob: async () => new Blob(['old']) });
  await flushPromises();
  expect(wrapper.find('img').exists()).toBe(false);
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});
it('失败可重试，导入失败走重试事件而不是第三方外链', async () => {
  const fetch = vi.fn().mockRejectedValue(new Error('503'));
  vi.stubGlobal('fetch', fetch);
  const wrapper = mount(VideoCover, {
    props: { fileId: 'file-a', title: '合成视频' },
  });
  wrappers.push(wrapper);
  await flushPromises();
  await wrapper.get('[aria-label="重试封面"]').trigger('click');
  await flushPromises();
  expect(fetch).toHaveBeenCalledTimes(2);
  await wrapper.setProps({ state: 'FAILED' });
  await wrapper.get('[aria-label="重试封面"]').trigger('click');
  expect(wrapper.emitted('retry')).toHaveLength(1);
  expect(fetch).toHaveBeenCalledTimes(2);
});
