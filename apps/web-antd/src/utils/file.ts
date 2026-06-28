import { useAccessStore } from '@vben/stores';

export const getFilePreviewUrl = (fileId?: number | string | null) => {
  if (!fileId) return '';
  const baseUrl = import.meta.env.VITE_GLOB_API_URL || '';
  return `${baseUrl}/file/preview/${fileId}`;
};

const imageCache = new Map<string, string>();

export async function fetchAuthImageUrl(
  fileId?: number | string | null,
): Promise<string> {
  if (!fileId) return '';
  const key = String(fileId);
  if (imageCache.has(key)) return imageCache.get(key)!;

  const url = getFilePreviewUrl(fileId);
  if (!url) return '';

  const token = useAccessStore().accessToken;
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error(`Failed to load image: ${response.status}`);
  }

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  imageCache.set(key, blobUrl);
  return blobUrl;
}

export function clearImageCache(fileId?: number | string | null) {
  if (fileId) {
    const key = String(fileId);
    const url = imageCache.get(key);
    if (url) URL.revokeObjectURL(url);
    imageCache.delete(key);
  } else {
    for (const url of imageCache.values()) URL.revokeObjectURL(url);
    imageCache.clear();
  }
}