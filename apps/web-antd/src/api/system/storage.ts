import { requestClient } from '#/api/request';

export interface StorageObject {
  directory: boolean;
  key: string;
  lastModified: null | string;
  previewable: boolean;
  size: number | string;
}

export interface StoragePage {
  bucket: string;
  items: StorageObject[];
  nextCursor: null | string;
  prefix: string;
}

export async function queryStorageObjects(params: {
  cursor?: string;
  pageSize?: number;
  prefix?: string;
}) {
  return requestClient.get<StoragePage>('/system/storage/objects', { params });
}

export async function deleteStorageObject(key: string) {
  return requestClient.delete<void>('/system/storage/object', {
    params: { key },
  });
}

export async function readStorageObject(
  key: string,
  download = false,
  signal?: AbortSignal,
) {
  const blob = await requestClient.get<Blob>(
    `/system/storage/${download ? 'download' : 'preview'}`,
    {
      params: { key },
      responseReturn: 'body',
      responseType: 'blob',
      signal,
      timeout: 120_000,
    },
  );
  if (
    download
      ? blob.type !== 'application/octet-stream'
      : !blob.type.startsWith('image/')
  ) {
    throw new Error('文件读取失败');
  }
  return blob;
}
