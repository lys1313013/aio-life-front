import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { reactive } from 'vue';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { useRecordDeepLink } from './useRecordDeepLink';

const mocks = vi.hoisted(() => ({ route: {} as any, access: {} as any }));
vi.mock('vue-router', () => ({ useRoute: () => mocks.route }));
vi.mock('@vben/stores', () => ({ useAccessStore: () => mocks.access }));
enableAutoUnmount(afterEach);
beforeEach(() => {
  mocks.route = reactive({
    path: '/my-hub/device',
    query: { id: '9007199254740993' },
  });
  mocks.access = reactive({ accessToken: 'account-a' });
});
function create(
  load: (id: string) => Promise<null | { id: string; name: string }>,
) {
  let state!: ReturnType<
    typeof useRecordDeepLink<{ id: string; name: string }>
  >;
  const wrapper = mount({
    setup() {
      state = useRecordDeepLink('/my-hub/device', load);
      return state;
    },
    template: '<div />',
  });
  return { state, wrapper };
}

it('按详情接口读取字符串 ID，不依赖当前列表分页或筛选', async () => {
  const load = vi
    .fn()
    .mockResolvedValue({ id: '9007199254740993', name: '第 51 个设备' });
  const { state } = create(load);
  expect(state.deepLinkLoading.value).toBe(true);
  await flushPromises();
  expect(load).toHaveBeenCalledExactlyOnceWith('9007199254740993');
  expect(state.deepLinkRecord.value?.name).toBe('第 51 个设备');
});

it('切换目标和离页后旧详情不再打开弹窗', async () => {
  let resolve!: (value: { id: string; name: string }) => void;
  const load = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((ok) => {
          resolve = ok;
        }),
    )
    .mockResolvedValueOnce({ id: '9007199254740995', name: '新设备' });
  const { state } = create(load);
  mocks.route.query.id = '9007199254740995';
  await flushPromises();
  expect(state.deepLinkRecord.value?.name).toBe('新设备');
  mocks.route.path = '/dashboard';
  await flushPromises();
  resolve({ id: '9007199254740993', name: '旧设备' });
  await flushPromises();
  expect(state.deepLinkRecord.value).toBeNull();
  expect(state.deepLinkLoading.value).toBe(false);
});

it('换账号丢弃旧响应，新账号无权限时显示失败并可重试', async () => {
  let resolve!: (value: { id: string; name: string }) => void;
  const load = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((ok) => {
          resolve = ok;
        }),
    )
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce({ id: '9007199254740993', name: '新账号设备' });
  const { state } = create(load);
  mocks.access.accessToken = 'account-b';
  await flushPromises();
  resolve({ id: '9007199254740993', name: '旧账号设备' });
  await flushPromises();
  expect(state.deepLinkRecord.value).toBeNull();
  expect(state.deepLinkError.value).toBe(true);
  await state.retryDeepLink();
  expect(state.deepLinkRecord.value?.name).toBe('新账号设备');
});

it('取消或卸载阻止等待中的详情重新打开', async () => {
  let resolve!: (value: { id: string; name: string }) => void;
  const load = vi.fn().mockImplementationOnce(
    () =>
      new Promise((ok) => {
        resolve = ok;
      }),
  );
  const { state, wrapper } = create(load);
  state.cancelDeepLink();
  wrapper.unmount();
  resolve({ id: '9007199254740993', name: '旧设备' });
  await flushPromises();
  expect(state.deepLinkRecord.value).toBeNull();
});

it.each(['/record/videoWatch', '/my-hub/videoWatch'])(
  '视频 canonical/旧 alias %s 都按详情 ID 打开',
  async (path) => {
    mocks.route.path = path;
    const load = vi
      .fn()
      .mockResolvedValue({ id: '9007199254740993', name: '视频' });
    let state!: ReturnType<
      typeof useRecordDeepLink<{ id: string; name: string }>
    >;
    mount({
      setup() {
        state = useRecordDeepLink(
          ['/record/videoWatch', '/my-hub/videoWatch'],
          load,
        );
        return state;
      },
      template: '<div />',
    });
    await flushPromises();
    expect(load).toHaveBeenCalledExactlyOnceWith('9007199254740993');
    expect(state.deepLinkRecord.value?.name).toBe('视频');
  },
);

it('已打开详情换账号/离页时清空记录，并产生显式表单重置信号', async () => {
  const load = vi
    .fn()
    .mockResolvedValue({ id: '9007199254740993', name: '设备' });
  const { state } = create(load);
  await flushPromises();
  const previousVersion = state.deepLinkResetVersion.value;
  mocks.access.accessToken = '';
  await flushPromises();
  expect(state.deepLinkRecord.value).toBeNull();
  expect(state.deepLinkResetVersion.value).toBeGreaterThan(previousVersion);
  const logoutVersion = state.deepLinkResetVersion.value;
  mocks.route.path = '/dashboard';
  await flushPromises();
  // Even a manual editor with no loaded deepLinkRecord receives a reset signal.
  expect(state.deepLinkResetVersion.value).toBeGreaterThan(logoutVersion);
});
