import { createIconifyIcon } from '@vben/icons';

// 获取分类图标的渲染组件
export function getCategoryIcon(icon: string | undefined) {
  if (!icon) return null;
  try {
    return createIconifyIcon(icon);
  } catch (error) {
    console.warn(`Failed to create icon: ${icon}`, error);
    return null;
  }
}

// 从图标名称提取图标集前缀
export function extractIconSet(icon: string | undefined): string {
  if (!icon) return 'lucide';
  if (icon.includes(':')) {
    const parts = icon.split(':');
    return parts[0] || 'lucide';
  }
  return 'lucide';
}
