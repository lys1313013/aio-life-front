import { useUserStore } from '@/store/user';

export const getFilePreviewUrl = (fileId?: number | string | null) => {
  if (!fileId) return '';
  const baseUrl = import.meta.env.VITE_APP_API_BASE_URL || '';
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

  const token = useUserStore().token;
  const response = await uni.request({
    url,
    header: token ? { Authorization: `Bearer ${token}` } : {},
    responseType: 'arraybuffer',
  });

  if (response.statusCode !== 200) {
    throw new Error(`Failed to load image: ${response.statusCode}`);
  }

  // 在 uniapp 中，使用 data URL 或临时文件路径
  const arrayBuffer = response.data as ArrayBuffer;
  const base64 = uni.arrayBufferToBase64(arrayBuffer);
  const mimeType = response.header?.['content-type'] || 'image/jpeg';
  const dataUrl = `data:${mimeType};base64,${base64}`;
  imageCache.set(key, dataUrl);
  return dataUrl;
}

export function clearImageCache(fileId?: number | string | null) {
  if (fileId) {
    imageCache.delete(String(fileId));
  } else {
    imageCache.clear();
  }
}
