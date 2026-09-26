import { addCollection } from '@iconify/vue';

import base from './generated/base.json';
import { collectionLoaders } from './generated/loaders';
import manifest from './generated/manifest.json';

type IconCollection = Parameters<typeof addCollection>[0];

for (const collection of base as unknown as IconCollection[])
  addCollection(collection);

const loaded = new Map<string, string[]>();
const pending = new Map<string, Promise<string[]>>();

export const localIconCollections = manifest.collections.map(
  ({ prefix, title }) => ({
    label: title,
    value: prefix,
  }),
);

const onlineCollections = [
  { label: 'Material Design Icons', value: 'mdi' },
  { label: 'Fluent Emoji（彩色）', value: 'fluent-emoji' },
  { label: 'Noto Emoji（彩色）', value: 'noto-color' },
];

export const iconCollectionOptions = [
  ...localIconCollections,
  ...onlineCollections.filter(
    ({ value }) => !localIconCollections.some((item) => item.value === value),
  ),
];

export function hasLocalIconCollection(prefix: string) {
  return Object.hasOwn(collectionLoaders, prefix);
}

/** Register SVG data before exposing picker names; failures remain retryable. */
export async function loadLocalIconCollection(
  prefix: string,
): Promise<string[]> {
  const cached = loaded.get(prefix);
  if (cached) return cached;
  const inflight = pending.get(prefix);
  if (inflight) return inflight;
  if (!hasLocalIconCollection(prefix))
    throw new Error(`Unknown local collection: ${prefix}`);
  const request = (async () => {
    const data =
      await collectionLoaders[prefix as keyof typeof collectionLoaders]();
    if (!addCollection(data))
      throw new Error(`Invalid local collection: ${prefix}`);
    const names = Object.entries(data.icons)
      .filter(([, icon]) => !('hidden' in icon && icon.hidden))
      .map(([name]) => `${prefix}:${name}`)
      .sort();
    loaded.set(prefix, names);
    return names;
  })().finally(() => pending.delete(prefix));
  pending.set(prefix, request);
  return request;
}
