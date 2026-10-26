import { createDaySwipe } from '#/views/time/time-tracker/day-swipe';

/** 左滑后一天、右滑前一天；鼠标和触控板与触屏方向一致。 */
export function createTimeCardSwipe(
  enabled: () => boolean,
  changeDate: (step: number) => void,
  canChange: (step: number) => boolean,
  onDrag: (offset: number, dragging: boolean) => void,
  now = Date.now,
) {
  const touch = createDaySwipe(
    enabled,
    (step) => {
      if (canChange(step)) changeDate(step);
    },
    (offset, dragging) => {
      const allowed = offset === 0 || canChange(offset < 0 ? 1 : -1);
      onDrag(allowed ? offset : 0, dragging && allowed);
    },
  );
  let mouseDown = false;
  let wheelAt = -Infinity;
  let wheelX = 0;
  let wheelY = 0;
  let wheelHandled = false;
  let suppressUntil = 0;
  const point = (event: MouseEvent) => ({
    clientX: event.clientX,
    clientY: event.clientY,
  });
  function cancel() {
    mouseDown = false;
    touch.cancel();
    wheelAt = -Infinity;
    wheelX = wheelY = 0;
    wheelHandled = false;
  }
  function mouseStart(
    event: MouseEvent & { sourceCapabilities?: { firesTouchEvents?: boolean } },
  ) {
    if (
      event.button !== 0 ||
      !enabled() ||
      event.sourceCapabilities?.firesTouchEvents
    )
      return;
    mouseDown = true;
    touch.touchStart({ touches: [point(event)], changedTouches: [] });
  }
  function mouseMove(event: MouseEvent) {
    if (!mouseDown) return;
    if (event.buttons !== 1) {
      cancel();
      return;
    }
    touch.touchMove({
      touches: [point(event)],
      changedTouches: [],
      preventDefault: () => event.preventDefault(),
    });
  }
  function mouseEnd(event: MouseEvent) {
    if (!mouseDown) return;
    mouseDown = false;
    touch.touchEnd({ touches: [], changedTouches: [point(event)] });
  }
  function wheel(event: WheelEvent) {
    if (event.ctrlKey) return false;
    const stamp = now();
    // 每串惯性滚动最多翻一天，停止后才能再次翻日。
    if (stamp - wheelAt > 200) {
      wheelX = wheelY = 0;
      wheelHandled = false;
    }
    wheelAt = stamp;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 100 : 1;
    wheelX += event.deltaX * unit;
    wheelY += event.deltaY * unit;
    if (Math.abs(wheelX) <= Math.abs(wheelY) * 1.5) return false;
    event.preventDefault();
    if (wheelHandled) return true;
    if (!enabled()) {
      wheelHandled = true;
      return true;
    }
    if (Math.abs(wheelX) < 50) return true;
    wheelHandled = true;
    suppressUntil = stamp + 400;
    const step = wheelX > 0 ? 1 : -1;
    if (canChange(step)) changeDate(step);
    return true;
  }
  return {
    ...touch,
    cancel,
    mouseStart,
    mouseMove,
    mouseEnd,
    wheel,
    ignoreClick: () => touch.ignoreClick() || now() < suppressUntil,
  };
}
