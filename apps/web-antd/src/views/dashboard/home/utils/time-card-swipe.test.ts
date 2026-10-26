import { describe, expect, it, vi } from 'vitest';

import { createTimeCardSwipe } from './time-card-swipe';

function fixture() {
  let date = 0;
  let now = 1000;
  const changed = vi.fn((step: number) => {
    date += step;
  });
  const drag = vi.fn();
  const swipe = createTimeCardSwipe(
    () => true,
    changed,
    (step) => date + step <= 0,
    drag,
    () => now,
  );
  return {
    swipe,
    changed,
    drag,
    advance: () => {
      now += 250;
    },
  };
}
const mouse = (x: number, extra = {}) =>
  ({
    clientX: x,
    clientY: 50,
    button: 0,
    buttons: 1,
    preventDefault: vi.fn(),
    ...extra,
  }) as MouseEvent;
function drag(swipe: ReturnType<typeof createTimeCardSwipe>, dx: number) {
  swipe.mouseStart(mouse(200));
  swipe.mouseMove(mouse(200 + dx));
  swipe.mouseEnd(mouse(200 + dx, { buttons: 0 }));
}
const wheel = (x: number, y = 0) =>
  ({
    deltaX: x,
    deltaY: y,
    deltaMode: 0,
    ctrlKey: false,
    preventDefault: vi.fn(),
  }) as unknown as WheelEvent;

describe('首页时迹桌面手势', () => {
  it('右拖前一天、左拖回今天，未来不偏移、不翻日', () => {
    const f = fixture();
    drag(f.swipe, -120);
    expect(f.changed).not.toHaveBeenCalled();
    expect(f.drag).not.toHaveBeenCalledWith(expect.any(Number), true);
    drag(f.swipe, 120);
    expect(f.changed).toHaveBeenLastCalledWith(-1);
    expect(f.swipe.ignoreClick()).toBe(true);
    drag(f.swipe, -120);
    expect(f.changed).toHaveBeenLastCalledWith(1);
  });
  it('触控板达到阈值才切日，同一串惯性只触发一次', () => {
    const f = fixture();
    f.swipe.wheel(wheel(-30));
    expect(f.changed).not.toHaveBeenCalled();
    f.swipe.wheel(wheel(-30));
    f.swipe.wheel(wheel(-150));
    expect(f.changed).toHaveBeenCalledExactlyOnceWith(-1);
    f.advance();
    f.swipe.wheel(wheel(100));
    expect(f.changed).toHaveBeenLastCalledWith(1);
    f.advance();
    f.swipe.wheel(wheel(100));
    expect(f.changed).toHaveBeenCalledTimes(2);
  });
  it('纵向滚动与缩放保留原生行为；取消鼠标拖动不翻日', () => {
    const f = fixture();
    const vertical = wheel(3, 100);
    expect(f.swipe.wheel(vertical)).toBe(false);
    expect(vertical.preventDefault).not.toHaveBeenCalled();
    expect(f.swipe.wheel({ ...wheel(100), ctrlKey: true } as WheelEvent)).toBe(
      false,
    );
    f.swipe.mouseStart(mouse(200));
    f.swipe.mouseMove(mouse(320));
    f.swipe.cancel();
    f.swipe.mouseEnd(mouse(320));
    expect(f.changed).not.toHaveBeenCalled();
  });
});
