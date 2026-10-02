import { describe, expect, it, vi } from 'vitest';

import { createDaySwipe, daySwipeStyle } from './day-swipe';

function point(clientX: number, clientY = 100) {
  return { clientX, clientY };
}
function event(x: number, y = 100) {
  return {
    touches: [point(x, y)],
    changedTouches: [point(x, y)],
    preventDefault: vi.fn(),
  };
}
function end(x: number, y = 100) {
  return { ...event(x, y), touches: [] };
}

// Exercise a complete gesture, including movement and release, rather than only offsets.
describe('day swipe', () => {
  it.each([
    [200, 80, 1],
    [80, 200, -1],
  ])('swipes from %s to %s exactly once', (from, to, offset) => {
    const change = vi.fn();
    const swipe = createDaySwipe(() => true, change);
    swipe.touchStart(event(from));
    const movement = event(to);
    swipe.touchMove(movement);
    expect(movement.preventDefault).toHaveBeenCalledOnce();
    swipe.touchEnd(end(to));
    swipe.touchEnd(end(to));
    expect(change).toHaveBeenCalledExactlyOnceWith(offset);
    expect(swipe.ignoreClick()).toBe(true);
    swipe.touchStart(event(to));
    swipe.touchEnd(end(to));
    expect(swipe.ignoreClick()).toBe(false);
  });

  it('leaves vertical scrolling native even when the finger later moves sideways', () => {
    const change = vi.fn();
    const swipe = createDaySwipe(() => true, change);
    swipe.touchStart(event(200));
    const vertical = event(195, 130);
    swipe.touchMove(vertical);
    swipe.touchMove(event(60, 140));
    swipe.touchEnd(end(60, 140));
    expect(vertical.preventDefault).not.toHaveBeenCalled();
    expect(change).not.toHaveBeenCalled();
  });

  it('ignores taps, short horizontal drags and diagonal drags', () => {
    const change = vi.fn();
    const swipe = createDaySwipe(() => true, change);
    for (const [x, y] of [
      [198, 101],
      [165, 100],
      [100, 190],
    ]) {
      swipe.touchStart(event(200));
      swipe.touchMove(event(x!, y!));
      swipe.touchEnd(end(x!, y!));
    }
    expect(change).not.toHaveBeenCalled();
  });

  it('cancels interrupted and multi-touch gestures', () => {
    const change = vi.fn();
    const swipe = createDaySwipe(() => true, change);
    swipe.touchStart(event(200));
    swipe.touchMove(event(80));
    swipe.cancel();
    swipe.touchEnd(end(80));
    swipe.touchStart(event(200));
    swipe.touchMove({ ...event(80), touches: [point(80), point(120)] });
    swipe.touchEnd(end(80));
    expect(change).not.toHaveBeenCalled();
  });

  it('does not navigate outside day mode, during loading, or if disabled mid-gesture', () => {
    const change = vi.fn();
    let enabled = false;
    const swipe = createDaySwipe(() => enabled, change);
    swipe.touchStart(event(200));
    swipe.touchMove(event(80));
    swipe.touchEnd(end(80));
    enabled = true;
    swipe.touchStart(event(200));
    swipe.touchMove(event(80));
    enabled = false;
    swipe.touchEnd(end(80));
    expect(change).not.toHaveBeenCalled();
  });
});

describe('day swipe motion', () => {
  it('follows horizontal movement with resistance and settles on release', () => {
    const change = vi.fn();
    const render = vi.fn();
    const swipe = createDaySwipe(() => true, change, render);
    swipe.touchStart(event(200));
    swipe.touchMove(event(100));
    expect(render.mock.lastCall?.[0]).toBeCloseTo(-55);
    expect(render.mock.lastCall?.[1]).toBe(true);
    swipe.touchMove(event(-1000));
    expect(render).toHaveBeenLastCalledWith(-96, true);
    swipe.touchEnd(end(-1000));
    expect(render).toHaveBeenLastCalledWith(0, false);
    expect(change).toHaveBeenCalledExactlyOnceWith(1);
    expect(daySwipeStyle(-96, true).transition).toBe('none');
    expect(daySwipeStyle(0, false)).toMatchObject({
      opacity: 1,
      transform: 'translateX(0px)',
    });
  });

  it('snaps back after a short swipe or cancellation without changing the date', () => {
    const change = vi.fn();
    const render = vi.fn();
    const swipe = createDaySwipe(() => true, change, render);
    swipe.touchStart(event(200));
    swipe.touchMove(event(170));
    swipe.touchEnd(end(170));
    expect(render).toHaveBeenLastCalledWith(0, false);
    swipe.touchStart(event(200));
    swipe.touchMove(event(80));
    swipe.cancel();
    expect(render).toHaveBeenLastCalledWith(0, false);
    expect(change).not.toHaveBeenCalled();
  });

  it('keeps content stationary during vertical scrolling', () => {
    const render = vi.fn();
    const swipe = createDaySwipe(() => true, vi.fn(), render);
    swipe.touchStart(event(200));
    render.mockClear();
    swipe.touchMove(event(190, 200));
    expect(render).not.toHaveBeenCalled();
  });
});
