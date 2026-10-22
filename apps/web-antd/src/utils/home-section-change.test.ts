import { expect, it, vi } from 'vitest';

import {
  afterHomeSectionWrite,
  HOME_SECTION_CHANGED,
} from './home-section-change';

it('仅成功写入通知一次对应摘要，透传结果与失败', async () => {
  const listener = vi.fn();
  window.addEventListener(HOME_SECTION_CHANGED, listener);
  try {
    expect(await afterHomeSectionWrite('memo', Promise.resolve('saved'))).toBe(
      'saved',
    );
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0].detail).toBe('memo');
    await expect(
      afterHomeSectionWrite('finance', Promise.reject(new Error('failed'))),
    ).rejects.toThrow('failed');
    expect(listener).toHaveBeenCalledTimes(1);
  } finally {
    window.removeEventListener(HOME_SECTION_CHANGED, listener);
  }
});
