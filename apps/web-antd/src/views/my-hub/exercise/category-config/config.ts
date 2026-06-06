import { createIconifyIcon } from '@vben/icons';

// 分类颜色预设
export const CATEGORY_COLOR_PRESETS = [
  '#1890ff', // 蓝色
  '#52c41a', // 绿色
  '#faad14', // 黄色
  '#f5222d', // 红色
  '#722ed1', // 紫色
  '#13c2c2', // 青色
  '#eb2f96', // 粉色
  '#fa8c16', // 橙色
  '#a0d911', // 草绿
  '#2f54eb', // 宝蓝
];

// 预设图标列表 (运动相关)
export const PRESET_ICONS = [
  { icon: 'lucide:run', label: '跑步' },
  { icon: 'lucide:bike', label: '骑行' },
  { icon: 'lucide:dumbbell', label: '力量' },
  { icon: 'lucide:person-standing', label: '健走' },
  { icon: 'lucide:activity', label: '有氧' },
  { icon: 'lucide:flame', label: '燃脂' },
  { icon: 'lucide:waves', label: '游泳' },
  { icon: 'lucide:target', label: '专项' },
  { icon: 'lucide:medal', label: '比赛' },
  { icon: 'lucide:trophy', label: '奖杯' },
  { icon: 'lucide:star', label: '重要' },
  { icon: 'lucide:heart', label: '心率' },
];

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
