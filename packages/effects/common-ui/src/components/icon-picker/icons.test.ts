import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const local = vi.hoisted(() => ({ has: vi.fn(), load: vi.fn() }));
vi.mock('@vben/icons', () => ({
  hasLocalIconCollection: local.has,
  loadLocalIconCollection: local.load,
}));

beforeEach(() => {
  vi.resetModules();
  local.has.mockReset().mockReturnValue(false);
  local.load.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('icon collection requests', () => {
  it('shares concurrent requests and caches only successful results', async () => {
    const fetch = vi.fn().mockResolvedValue(
      Response.json({
        prefix: 'mdi',
        uncategorized: ['run'],
        categories: { sport: ['run', 'bike'] },
      }),
    );
    vi.stubGlobal('fetch', fetch);
    const { fetchIconsData } = await import('./icons');
    const lists = await Promise.all([
      fetchIconsData('mdi'),
      fetchIconsData('mdi'),
    ]);
    expect(lists).toEqual([
      ['mdi:run', 'mdi:bike'],
      ['mdi:run', 'mdi:bike'],
    ]);
    await fetchIconsData('mdi');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    () => Promise.reject(new TypeError('Network failure')),
    () => Promise.resolve(new Response('{}', { status: 503 })),
    () => Promise.resolve(new Response('not json')),
    () =>
      Promise.resolve(
        Response.json({ prefix: 'wrong', uncategorized: ['run'] }),
      ),
    () => Promise.resolve(Response.json({ prefix: 'mdi', uncategorized: [] })),
    () =>
      Promise.resolve(
        Response.json({ prefix: 'mdi', categories: { sport: 'run' } }),
      ),
  ])(
    'retries after network, HTTP, JSON or payload failure %#',
    async (fail) => {
      vi.useFakeTimers();
      const fetch = vi
        .fn()
        .mockImplementationOnce(fail)
        .mockResolvedValue(
          Response.json({ prefix: 'mdi', uncategorized: ['run'] }),
        );
      vi.stubGlobal('fetch', fetch);
      const { fetchIconsData, ICONS_MAP } = await import('./icons');
      await expect(fetchIconsData('mdi')).rejects.toThrow();
      expect(ICONS_MAP.mdi).toBeUndefined();
      expect(vi.getTimerCount()).toBe(0);
      await expect(fetchIconsData('mdi')).resolves.toEqual(['mdi:run']);
      expect(fetch).toHaveBeenCalledTimes(2);
    },
  );

  it('aborts a stalled request and allows retry', async () => {
    vi.useFakeTimers();
    const fetch = vi
      .fn()
      .mockImplementationOnce(
        (_, { signal }) =>
          new Promise((_, reject) => {
            signal.addEventListener('abort', () =>
              reject(new Error('Aborted')),
            );
          }),
      )
      .mockResolvedValue(
        Response.json({ prefix: 'mdi', uncategorized: ['run'] }),
      );
    vi.stubGlobal('fetch', fetch);
    const { fetchIconsData } = await import('./icons');
    const rejected = expect(fetchIconsData('mdi')).rejects.toThrow('Aborted');
    await vi.advanceTimersByTimeAsync(10_000);
    await rejected;
    await expect(fetchIconsData('mdi')).resolves.toEqual(['mdi:run']);
  });

  it('uses local SVG resources without fetching the external catalog and retries local failures', async () => {
    local.has.mockReturnValue(true);
    local.load
      .mockRejectedValueOnce(new Error('Chunk failed'))
      .mockResolvedValue(['lucide:home']);
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const { fetchIconsData } = await import('./icons');
    await expect(fetchIconsData('lucide')).rejects.toThrow('Chunk failed');
    await expect(fetchIconsData('lucide')).resolves.toEqual(['lucide:home']);
    expect(fetch).not.toHaveBeenCalled();
  });
});
