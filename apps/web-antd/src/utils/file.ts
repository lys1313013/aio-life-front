export const getFilePreviewUrl = (fileId?: number | string | null) => {
  if (!fileId) return '';
  // 假设 VITE_GLOB_API_URL 配置的是基础网关地址
  const baseUrl = import.meta.env.VITE_GLOB_API_URL || '';
  return `${baseUrl}/file/preview/${fileId}`;
};