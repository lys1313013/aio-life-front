import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, KeepAlive, ref } from 'vue';

import { describe, expect, it, vi } from 'vitest';

import { useHomeRequest } from './useHomeRequest';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
function fixture(fetch: () => Promise<string[]>) {
  const data = ref<string[]>([]);
  let request!: ReturnType<typeof useHomeRequest<string[]>>;
  const component = defineComponent({
    setup() {
      request = useHomeRequest({
        fetch,
        apply: (rows) => {
          data.value = rows;
        },
      });
      return () => h('div', data.value.join(','));
    },
  });
  const wrapper = mount(component);
  return { wrapper, data, request };
}
describe('首页公共请求状态', () => {
  it('首次失败不是成功空态；刷新失败保留已加载空态和数据', async () => {
    const fetch = vi
      .fn<() => Promise<string[]>>()
      .mockRejectedValueOnce(new Error('offline'));
    const { request, data, wrapper } = fixture(fetch);
    await request.load();
    expect(request.failed.value).toBe(true);
    expect(request.loaded.value).toBe(false);
    fetch.mockResolvedValueOnce([]);
    await request.load();
    expect(request.loaded.value).toBe(true);
    expect(data.value).toEqual([]);
    fetch.mockRejectedValueOnce(new Error('offline'));
    await request.load();
    expect(request.loaded.value).toBe(true);
    expect(data.value).toEqual([]);
    fetch.mockResolvedValueOnce(['record']);
    await request.load();
    fetch.mockRejectedValueOnce(new Error('offline'));
    await request.load();
    expect(data.value).toEqual(['record']);
    expect(request.loading.value).toBe(false);
    wrapper.unmount();
  });
  it('普通刷新合并，写入后刷新拒绝旧响应，旧 finally 不清除新 loading', async () => {
    const fresh = deferred<string[]>();
    const old = deferred<string[]>();
    const fetch = vi
      .fn<() => Promise<string[]>>()
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(fresh.promise);
    const { request, data, wrapper } = fixture(fetch);
    const first = request.load();
    expect(request.load()).toBe(first);
    const afterWrite = request.load(true);
    await flushPromises();
    expect(fetch).toHaveBeenCalledTimes(2);
    old.resolve(['old']);
    await first;
    expect(data.value).toEqual([]);
    expect(request.loading.value).toBe(true);
    fresh.resolve(['new']);
    await afterWrite;
    expect(data.value).toEqual(['new']);
    expect(request.loading.value).toBe(false);
    wrapper.unmount();
  });
  it('卸载后旧请求不更新内容、不回调副作用', async () => {
    const pending = deferred<string[]>();
    const { request, data, wrapper } = fixture(() => pending.promise);
    const operation = request.load();
    wrapper.unmount();
    pending.resolve(['late']);
    await operation;
    expect(data.value).toEqual([]);
    expect(request.loaded.value).toBe(false);
  });
  it('缓存离页保留数据，回页重新查询，离页前旧结果失效', async () => {
    const pending = deferred<string[]>();
    const fetch = vi
      .fn<() => Promise<string[]>>()
      .mockResolvedValueOnce(['record'])
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce(['new']);
    let request!: ReturnType<typeof useHomeRequest<string[]>>;
    const data = ref<string[]>([]);
    const show = ref(true);
    const Child = defineComponent({
      setup() {
        request = useHomeRequest({
          fetch,
          apply: (rows) => {
            data.value = rows;
          },
        });
        return () => h('div', data.value.join(','));
      },
    });
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(KeepAlive, null, () => (show.value ? h(Child) : null)),
      }),
    );
    await request.load();
    const old = request.load();
    show.value = false;
    await flushPromises();
    expect(data.value).toEqual(['record']);
    show.value = true;
    await flushPromises();
    expect(data.value).toEqual(['new']);
    pending.resolve(['late']);
    await old;
    expect(data.value).toEqual(['new']);
    wrapper.unmount();
  });
});
