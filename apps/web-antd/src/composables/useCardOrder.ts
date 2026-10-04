import type { Ref } from 'vue';

import type { CardMove, CardOrder } from '#/api/bank-card/order';

import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { useSortable } from '@vben/hooks';

/** 两个卡片网格共用拖动、键盘移动与失败回滚；ID 始终保留字符串。 */
export function useCardOrder<T extends CardOrder>(options: {
  changed?: (item: T) => void;
  container: Ref<HTMLElement | undefined>;
  descendingId?: boolean;
  disabled: Readonly<Ref<boolean>>;
  items: Ref<T[]>;
  save: (move: CardMove) => Promise<CardOrder[]>;
  visible: Readonly<Ref<T[]>>;
}) {
  const busyId = ref('');
  const dragging = ref(false);
  const blocked = computed(() => options.disabled.value || !!busyId.value);
  let suppressUntil = 0;
  let alive = true;
  let draggedIds: string[] = [];

  async function move(id: string, targetId: string, after: boolean) {
    if (blocked.value || id === targetId) return;
    const ordered = [...options.items.value].sort(
      (a, b) =>
        a.sortOrder - b.sortOrder ||
        (options.descendingId ? -1 : 1) *
          a.id.localeCompare(b.id, undefined, { numeric: true }),
    );
    const moving = ordered.find((item) => item.id === id);
    if (!moving || !ordered.some((item) => item.id === targetId)) return;
    const original = new Map(ordered.map((item) => [item.id, item.sortOrder]));
    ordered.splice(ordered.indexOf(moving), 1);
    ordered.splice(
      ordered.findIndex((item) => item.id === targetId) + (after ? 1 : 0),
      0,
      moving,
    );
    const optimistic = new Map(ordered.map((item, index) => [item.id, index]));
    const patch = (ranks: Map<string, number>) => {
      options.items.value = options.items.value.map((item) => ({
        ...item,
        sortOrder: ranks.get(item.id) ?? item.sortOrder,
      }));
    };
    busyId.value = id;
    patch(optimistic);
    try {
      const changes = await options.save({ id, targetId, after });
      if (!alive) return;
      // 用服务端完整序号同步，兼容其他会话已调整过顺序。
      patch(
        new Map([
          ...original,
          ...changes.map((item) => [item.id, item.sortOrder] as const),
        ]),
      );
      for (const item of options.items.value) options.changed?.(item);
    } catch {
      if (alive) patch(original);
    } finally {
      busyId.value = '';
    }
  }

  function keyboard(event: KeyboardEvent, id: string) {
    const direction = ['ArrowLeft', 'ArrowUp'].includes(event.key)
      ? -1
      : ['ArrowDown', 'ArrowRight'].includes(event.key)
        ? 1
        : 0;
    if (!direction) return;
    event.preventDefault();
    event.stopPropagation();
    const list = options.visible.value;
    const target = list[list.findIndex((item) => item.id === id) + direction];
    if (target) void move(id, target.id, direction > 0);
  }

  function guardClick(event: MouseEvent) {
    if (dragging.value || Date.now() < suppressUntil) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  watch(
    options.container,
    async (container, _, onCleanup) => {
      if (!container) return;
      let cancelled = false;
      let destroy: (() => void) | undefined;
      onCleanup(() => {
        cancelled = true;
        destroy?.();
        dragging.value = false;
      });
      const sortable = await useSortable(container, {
        draggable: '[data-card-id]',
        filter: 'button, input, a, .ant-dropdown, .ant-popover',
        preventOnFilter: false,
        delay: 250,
        delayOnTouchOnly: true,
        touchStartThreshold: 5,
        animation: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 0
          : 180,
        ghostClass: 'opacity-40',
        disabled: blocked.value,
        onStart() {
          dragging.value = true;
          draggedIds = options.visible.value.map((item) => item.id);
        },
        onEnd(event) {
          dragging.value = false;
          suppressUntil = Date.now() + 250;
          // Sortable 修改了 DOM；先恢复，让 Vue 根据数据完成移动。
          const { oldIndex, oldDraggableIndex, newDraggableIndex, item } =
            event;
          if (oldIndex !== undefined) {
            item.remove();
            container.insertBefore(item, container.children[oldIndex] ?? null);
          }
          if (
            oldDraggableIndex === undefined ||
            newDraggableIndex === undefined ||
            oldDraggableIndex === newDraggableIndex ||
            draggedIds.join(',') !==
              options.visible.value.map((row) => row.id).join(',')
          )
            return;
          const id = draggedIds[oldDraggableIndex];
          const targetId = draggedIds[newDraggableIndex];
          if (id && targetId)
            void move(id, targetId, newDraggableIndex > oldDraggableIndex);
        },
      }).initializeSortable();
      if (cancelled) {
        sortable?.destroy();
        return;
      }
      const stop = watch(
        blocked,
        (value) => sortable?.option('disabled', value),
        { immediate: true },
      );
      destroy = () => {
        stop();
        sortable?.destroy();
      };
    },
    { flush: 'post' },
  );
  onBeforeUnmount(() => {
    alive = false;
  });
  return { busyId, dragging, move, keyboard, guardClick };
}
