import { useAccessStore } from '@vben/stores';

export const getFilePreviewUrl = (fileId?: null | number | string) => {
  if (!fileId) return '';
  const baseUrl = import.meta.env.VITE_GLOB_API_URL || '';
  return `${baseUrl}/file/preview/${fileId}`;
};

const MAX_IMAGE_CACHE_SIZE = 100;
const imageCache = new Map<string, string>();
const pendingImages = new Map<string, Promise<string>>();
const activeImageRequests = new Map<string, number>();
const cacheVersions = new Map<string, number>();

function getCachedImage(key: string) {
  const cached = imageCache.get(key);
  if (!cached) return undefined;
  imageCache.delete(key);
  imageCache.set(key, cached);
  return cached;
}

function cacheImage(key: string, blobUrl: string) {
  imageCache.set(key, blobUrl);
  while (imageCache.size > MAX_IMAGE_CACHE_SIZE) {
    const oldestKey = imageCache.keys().next().value;
    if (!oldestKey) break;
    const oldestUrl = imageCache.get(oldestKey);
    if (oldestUrl) URL.revokeObjectURL(oldestUrl);
    imageCache.delete(oldestKey);
  }
}

export async function fetchAuthImageUrl(
  fileId?: null | number | string,
): Promise<string> {
  if (!fileId) return '';
  const key = String(fileId);
  const cached = getCachedImage(key);
  if (cached) return cached;

  const pending = pendingImages.get(key);
  if (pending) return pending;

  const url = getFilePreviewUrl(fileId);
  if (!url) return '';

  const version = cacheVersions.get(key) ?? 0;
  activeImageRequests.set(key, (activeImageRequests.get(key) ?? 0) + 1);
  const request = (async () => {
    const token = useAccessStore().accessToken;
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      throw new Error(`Failed to load image: ${response.status}`);
    }

    const blobUrl = URL.createObjectURL(await response.blob());
    if ((cacheVersions.get(key) ?? 0) !== version) {
      URL.revokeObjectURL(blobUrl);
      return '';
    }
    cacheImage(key, blobUrl);
    return blobUrl;
  })();

  pendingImages.set(key, request);
  try {
    return await request;
  } finally {
    if (pendingImages.get(key) === request) pendingImages.delete(key);
    const activeCount = activeImageRequests.get(key) ?? 1;
    if (activeCount <= 1) {
      activeImageRequests.delete(key);
      cacheVersions.delete(key);
    } else {
      activeImageRequests.set(key, activeCount - 1);
    }
  }
}

export function clearImageCache(fileId?: null | number | string) {
  if (fileId) {
    const key = String(fileId);
    if (activeImageRequests.has(key)) {
      cacheVersions.set(key, (cacheVersions.get(key) ?? 0) + 1);
    }
    pendingImages.delete(key);
    const url = imageCache.get(key);
    if (url) URL.revokeObjectURL(url);
    imageCache.delete(key);
  } else {
    for (const key of activeImageRequests.keys()) {
      cacheVersions.set(key, (cacheVersions.get(key) ?? 0) + 1);
    }
    pendingImages.clear();
    for (const url of imageCache.values()) URL.revokeObjectURL(url);
    imageCache.clear();
  }
}
