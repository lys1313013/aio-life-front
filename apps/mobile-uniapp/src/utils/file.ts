export const getFilePreviewUrl = (fileId?: number | string | null) => {
  if (!fileId) return '';
  // 假设 VITE_APP_API_BASE_URL 配置的是基础网关地址
  const baseUrl = import.meta.env.VITE_APP_API_BASE_URL || '';
  return `${baseUrl}/file/preview/${fileId}`;
};