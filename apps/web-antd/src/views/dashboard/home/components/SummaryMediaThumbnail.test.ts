import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { reactive } from 'vue';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import SummaryMediaThumbnail from './SummaryMediaThumbnail.vue';

const mocks = vi.hoisted(() => ({
  access: {} as any,
  query: vi.fn(),
  retry: vi.fn(),
  image: vi.fn(),
  clearImage: vi.fn(),
}));
vi.mock('@vben/stores', () => ({ useAccessStore: () => mocks.access }));
vi.mock('#/api/core/bilibili-video', () => ({
  queryVideoCovers: mocks.query,
  retryVideoCover: mocks.retry,
}));
vi.mock('#/utils/file', () => ({
  fetchAuthImageUrl: mocks.image,
  clearImageCache: mocks.clearImage,
}));
vi.mock('#/views/my-hub/videoWatch/VideoCover.vue', () => ({
  default: {
    name: 'VideoCover',
    props: ['fileId', 'state', 'title'],
    emits: ['retry'],
    template: '<button data-video @click="$emit(\'retry\')" />',
  },
}));
enableAutoUnmount(afterEach);
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.access = reactive({ accessToken: 'account-a' });
  mocks.image.mockResolvedValue('blob:device');
  mocks.retry.mockResolvedValue(undefined);
});
afterEach(() => vi.useRealTimers());
const id = '9007199254740993';

it('设备授权图片失败后可重试，所有状态保留 44×44 占位', async () => {
  mocks.image.mockRejectedValueOnce(new Error('network'));
  const wrapper = mount(SummaryMediaThumbnail, {
    props: { kind: 'device', fileId: 'image-a', recordId: id, title: '设备' },
  });
  expect(wrapper.attributes('style')).toContain('width: 44px; height: 44px');
  await flushPromises();
  await wrapper.get('[aria-label="重试设备图片"]').trigger('click');
  await flushPromises();
  expect(mocks.clearImage).toHaveBeenCalledWith('image-a');
  expect(wrapper.get('img').attributes('src')).toBe('blob:device');
  expect(wrapper.attributes('style')).toContain('width: 44px; height: 44px');
});

it('视频导入失败点击重试实际发起 API，并轮询到新封面后停止', async () => {
  mocks.query.mockResolvedValue([
    { id, coverFileId: 'new-cover', coverState: 'READY' },
  ]);
  const wrapper = mount(SummaryMediaThumbnail, {
    props: { kind: 'video', state: 'FAILED', recordId: id, title: '视频' },
  });
  expect(wrapper.attributes('style')).toContain('width: 72px; height: 44px');
  await wrapper.get('[data-video]').trigger('click');
  await flushPromises();
  expect(mocks.retry).toHaveBeenCalledExactlyOnceWith(id);
  await vi.advanceTimersByTimeAsync(3000);
  expect(mocks.query).toHaveBeenCalledExactlyOnceWith([id]);
  expect(wrapper.getComponent({ name: 'VideoCover' }).props('fileId')).toBe(
    'new-cover',
  );
  expect(vi.getTimerCount()).toBe(0);
});

it('轮询失败停止自动请求，允许显式重试；卸载清理定时器', async () => {
  mocks.query.mockRejectedValueOnce(new Error('offline'));
  const wrapper = mount(SummaryMediaThumbnail, {
    props: { kind: 'video', state: 'PENDING', recordId: id, title: '视频' },
  });
  await vi.advanceTimersByTimeAsync(3000);
  expect(vi.getTimerCount()).toBe(0);
  await wrapper.get('[aria-label="重试封面状态"]').trigger('click');
  expect(mocks.retry).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(1);
  wrapper.unmount();
  expect(vi.getTimerCount()).toBe(0);
});

it('换账号后丢弃旧封面状态响应，退出账号不继续轮询', async () => {
  let resolve!: (value: unknown) => void;
  mocks.query.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const wrapper = mount(SummaryMediaThumbnail, {
    props: { kind: 'video', state: 'PENDING', recordId: id, title: '视频' },
  });
  await vi.advanceTimersByTimeAsync(3000);
  mocks.access.accessToken = '';
  await flushPromises();
  resolve([{ id, coverFileId: 'old-account-cover', coverState: 'READY' }]);
  await flushPromises();
  expect(wrapper.find('[data-video]').exists()).toBe(false);
  expect(vi.getTimerCount()).toBe(0);
});

it('持续 PENDING 最多轮询 20 次，然后等待用户重试', async () => {
  mocks.query.mockResolvedValue([{ id, coverState: 'PENDING' }]);
  const wrapper = mount(SummaryMediaThumbnail, {
    props: { kind: 'video', state: 'PENDING', recordId: id, title: '视频' },
  });
  await vi.advanceTimersByTimeAsync(60_000);
  expect(mocks.query).toHaveBeenCalledTimes(20);
  expect(vi.getTimerCount()).toBe(0);
  expect(wrapper.find('[aria-label="重试封面状态"]').exists()).toBe(true);
});
