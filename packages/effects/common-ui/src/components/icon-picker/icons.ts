import { hasLocalIconCollection, loadLocalIconCollection } from '@vben/icons';

/** Only validated successful results live for the lifetime of the page. */
export const ICONS_MAP: Record<string, string[]> = Object.create(null);
const pendingRequests = new Map<string, Promise<string[]>>();

interface IconifyResponse {
  prefix: string;
  uncategorized?: string[];
  categories?: Record<string, string[]>;
}

function parseCollection(data: IconifyResponse, prefix: string): string[] {
  if (!data || data.prefix !== prefix)
    throw new Error('Invalid icon collection');
  if (
    data.categories !== undefined &&
    (typeof data.categories !== 'object' ||
      data.categories === null ||
      Array.isArray(data.categories))
  ) {
    throw new Error('Invalid icon categories');
  }
  const groups = [
    data.uncategorized ?? [],
    ...Object.values(data.categories ?? {}),
  ];
  if (
    groups.some(
      (group) =>
        !Array.isArray(group) ||
        group.some(
          (name) =>
            typeof name !== 'string' ||
            !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name),
        ),
    )
  ) {
    throw new Error('Invalid icon names');
  }
  const names = [...new Set(groups.flat())];
  if (names.length === 0) throw new Error('Empty icon collection');
  return names.map((name) => `${prefix}:${name}`);
}

export async function fetchIconsData(prefix: string): Promise<string[]> {
  if (ICONS_MAP[prefix]) return ICONS_MAP[prefix];
  const pending = pendingRequests.get(prefix);
  if (pending) return pending;

  const request = (async () => {
    if (hasLocalIconCollection(prefix)) return loadLocalIconCollection(prefix);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(
        `https://api.iconify.design/collection?prefix=${encodeURIComponent(prefix)}`,
        { signal: controller.signal },
      );
      if (!response.ok)
        throw new Error(`Icon collection HTTP ${response.status}`);
      return parseCollection(await response.json(), prefix);
    } finally {
      clearTimeout(timeoutId);
    }
  })()
    .then((names) => {
      ICONS_MAP[prefix] = names;
      return names;
    })
    .finally(() => pendingRequests.delete(prefix));

  pendingRequests.set(prefix, request);
  return request;
}
