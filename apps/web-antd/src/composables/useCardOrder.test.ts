import type { CardOrder } from '#/api/bank-card/order';

import { flushPromises, mount } from '@vue/test-utils';
import { computed, defineComponent, h, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { useCardOrder } from './useCardOrder';

const sortable = vi.hoisted(() => ({
  options: {} as any,
  destroy: vi.fn(),
  option: vi.fn(),
}));
vi.mock('@vben/hooks', () => ({
  useSortable: (_: unknown, options: unknown) => {
    sortable.options = options;
    return { initializeSortable: async () => sortable };
  },
}));
const wrappers: ReturnType<typeof mount>[] = [];
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  vi.clearAllMocks();
});

function render(descendingId = false) {
  const ids = ['9007199254740993', '9007199254740994', '9007199254740995'];
  const items = ref(
    ids.map((id, index) => ({ id, sortOrder: index * 10, name: `卡${index}` })),
  );
  const hidden = ref('');
  const disabled = ref(false);
  const save = vi.fn<(move: unknown) => Promise<CardOrder[]>>();
  let order!: ReturnType<typeof useCardOrder>;
  const wrapper = mount(
    defineComponent({
      setup() {
        const container = ref<HTMLElement>();
        const visible = computed(() =>
          items.value
            .filter((item) => item.id !== hidden.value)
            .toSorted((a, b) => a.sortOrder - b.sortOrder),
        );
        order = useCardOrder({
          container,
          items,
          visible,
          disabled,
          save,
          descendingId,
        });
        return () =>
          h(
            'div',
            { ref: container },
            visible.value.map((item) =>
              h('div', { key: item.id, 'data-card-id': item.id }, item.name),
            ),
          );
      },
    }),
  );
  wrappers.push(wrapper);
  return {
    wrapper,
    items,
    hidden,
    disabled,
    save,
    ids,
    get order() {
      return order;
    },
  };
}

function pending<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((ok, fail) => {
    resolve = ok;
    reject = fail;
  });
  return { promise, resolve, reject };
}

describe('卡片拖动排序', () => {
  it('拖动恢复 DOM 后由 Vue 更新，提交目标位置并阻止误触编辑', async () => {
    const page = render();
    await flushPromises();
    const request = pending<CardOrder[]>();
    page.save.mockReturnValueOnce(request.promise);
    const item = page.wrapper.element.children[0]!;
    sortable.options.onStart();
    page.wrapper.element.append(item);
    sortable.options.onEnd({
      item,
      oldIndex: 0,
      oldDraggableIndex: 0,
      newDraggableIndex: 2,
    });
    await flushPromises();
    expect(page.save).toHaveBeenCalledWith({
      id: page.ids[0],
      targetId: page.ids[2],
      after: true,
    });
    expect(
      [...page.wrapper.element.children].map((node) => node.dataset.cardId),
    ).toEqual([page.ids[1], page.ids[2], page.ids[0]]);
    expect(page.order.busyId.value).toBe(page.ids[0]);
    const click = new MouseEvent('click', { cancelable: true });
    page.order.guardClick(click);
    expect(click.defaultPrevented).toBe(true);
    request.resolve([
      { id: page.ids[0]!, sortOrder: 2 },
      { id: page.ids[1]!, sortOrder: 0 },
      { id: page.ids[2]!, sortOrder: 1 },
    ]);
    await flushPromises();
    expect(page.order.busyId.value).toBe('');
  });

  it('失败恢复原序号，保留其他字段，等待期间不重复提交', async () => {
    const page = render();
    const request = pending<CardOrder[]>();
    page.save.mockReturnValueOnce(request.promise);
    const result = page.order.move(page.ids[0]!, page.ids[2]!, true);
    await page.order.move(page.ids[1]!, page.ids[2]!, true);
    page.items.value[0]!.name = '更新后的名称';
    expect(page.save).toHaveBeenCalledTimes(1);
    request.reject(new Error('offline'));
    await result;
    expect(page.items.value.map((item) => item.sortOrder)).toEqual([0, 10, 20]);
    expect(page.items.value[0]!.name).toBe('更新后的名称');
  });

  it('筛选后用可见相邻项定位，采用服务端完整排序补丁', async () => {
    const page = render();
    page.hidden.value = page.ids[1]!;
    page.save.mockResolvedValueOnce([
      { id: page.ids[0]!, sortOrder: 8 },
      { id: page.ids[1]!, sortOrder: 6 },
      { id: page.ids[2]!, sortOrder: 7 },
    ]);
    page.order.keyboard(
      new KeyboardEvent('keydown', { key: 'ArrowDown' }),
      page.ids[0]!,
    );
    await flushPromises();
    expect(page.save).toHaveBeenCalledWith({
      id: page.ids[0],
      targetId: page.ids[2],
      after: true,
    });
    expect(page.items.value.map((item) => item.sortOrder)).toEqual([8, 6, 7]);
  });

  it('加载期间、边界和原地放下不发起排序', async () => {
    const page = render();
    await flushPromises();
    page.order.keyboard(
      new KeyboardEvent('keydown', { key: 'ArrowUp' }),
      page.ids[0]!,
    );
    page.disabled.value = true;
    await page.order.move(page.ids[0]!, page.ids[1]!, true);
    const item = page.wrapper.element.children[0]!;
    sortable.options.onStart();
    sortable.options.onEnd({
      item,
      oldIndex: 0,
      oldDraggableIndex: 0,
      newDraggableIndex: 0,
    });
    expect(page.save).not.toHaveBeenCalled();
  });

  it('拖动时筛选变化取消旧拖动，卸载销毁实例', async () => {
    const page = render();
    await flushPromises();
    sortable.options.onStart();
    page.hidden.value = page.ids[1]!;
    sortable.options.onEnd({
      item: page.wrapper.element.children[0]!,
      oldIndex: 0,
      oldDraggableIndex: 0,
      newDraggableIndex: 1,
    });
    expect(page.save).not.toHaveBeenCalled();
    page.wrapper.unmount();
    expect(sortable.destroy).toHaveBeenCalled();
  });
});
