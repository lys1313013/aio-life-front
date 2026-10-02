interface TouchPoint {
  clientX: number;
  clientY: number;
}

interface SwipeEvent {
  changedTouches: ArrayLike<TouchPoint>;
  touches: ArrayLike<TouchPoint>;
  preventDefault?: () => void;
}

/** 单指横滑切日；先锁定方向，避免纵向滚动结束时误切日期。 */
export function createDaySwipe(
  enabled: () => boolean,
  changeDay: (offset: number) => void,
  onDrag?: (offset: number, dragging: boolean) => void,
) {
  let start: null | TouchPoint = null;
  let direction = '';
  let suppressClickUntil = 0;

  function cancel() {
    if (start && direction) suppressClickUntil = Date.now() + 400;
    start = null;
    direction = '';
    onDrag?.(0, false);
  }

  function touchStart(event: SwipeEvent) {
    cancel();
    if (!enabled() || event.touches.length !== 1) return;
    const point = event.touches[0];
    if (!point) return;
    start = { clientX: point.clientX, clientY: point.clientY };
    suppressClickUntil = 0;
  }

  function touchMove(event: SwipeEvent) {
    if (!start) return;
    if (!enabled() || event.touches.length !== 1) {
      cancel();
      return;
    }
    const point = event.touches[0];
    if (!point) return;
    const dx = point.clientX - start.clientX;
    const dy = point.clientY - start.clientY;
    if (!direction && Math.max(Math.abs(dx), Math.abs(dy)) > 10) {
      direction = Math.abs(dx) > Math.abs(dy) * 1.5 ? 'horizontal' : 'vertical';
    }
    if (direction) suppressClickUntil = Date.now() + 400;
    if (direction === 'horizontal') {
      event.preventDefault?.();
      // 阻尼跟手并限制位移，避免长距离拖动将内容完全移出视口。
      onDrag?.(Math.max(-96, Math.min(96, dx * 0.55)), true);
    }
  }

  function touchEnd(event: SwipeEvent) {
    if (!start) return;
    const point = event.changedTouches[0];
    const dx = point ? point.clientX - start.clientX : 0;
    const dy = point ? point.clientY - start.clientY : 0;
    const shouldChange =
      enabled() &&
      event.touches.length === 0 &&
      event.changedTouches.length === 1 &&
      direction === 'horizontal' &&
      Math.abs(dx) >= 50 &&
      Math.abs(dx) > Math.abs(dy) * 1.5;
    cancel();
    if (shouldChange) changeDay(dx < 0 ? 1 : -1);
  }

  return {
    cancel,
    ignoreClick: () => Date.now() < suppressClickUntil,
    touchEnd,
    touchMove,
    touchStart,
  };
}

/** 松手时恢复居中；同一内容容器保留到下一日期，承接切日过渡。 */
export function daySwipeStyle(offset: number, dragging: boolean) {
  return {
    opacity: 1 - Math.abs(offset) / 480,
    transform: `translateX(${offset}px)`,
    transition: dragging
      ? 'none'
      : 'transform 200ms ease-out, opacity 200ms ease-out',
  };
}
