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
  { icon: 'mdi:run' },
  { icon: 'mdi:bike' },
  { icon: 'mdi:swim' },
  { icon: 'mdi:dumbbell' },
  { icon: 'mdi:weight-lifter' },
  { icon: 'mdi:yoga' },
  { icon: 'mdi:basketball' },
  { icon: 'mdi:soccer' },
  { icon: 'mdi:tennis' },
  { icon: 'mdi:badminton' },
  { icon: 'mdi:table-tennis' },
  { icon: 'mdi:volleyball' },
  { icon: 'mdi:baseball' },
  { icon: 'mdi:golf' },
  { icon: 'mdi:bowling' },
  { icon: 'mdi:hiking' },
  { icon: 'mdi:jump-rope' },
  { icon: 'mdi:skateboarding' },
  { icon: 'mdi:roller-skate' },
  { icon: 'mdi:snowboard' },
  { icon: 'mdi:ski' },
  { icon: 'mdi:boxing-glove' },
  { icon: 'mdi:karate' },
  { icon: 'mdi:sword-cross' },
  { icon: 'mdi:arm-flex' },
  { icon: 'mdi:stretching' },
  { icon: 'mdi:shoe-sneaker' },
  { icon: 'mdi:tshirt-crew' },
  { icon: 'mdi:water' },
  { icon: 'mdi:fire' },
  { icon: 'mdi:heart-pulse' },
  { icon: 'mdi:stopwatch' },
  { icon: 'mdi:timer' },
  { icon: 'mdi:whistle' },
  { icon: 'mdi:medal' },
  { icon: 'mdi:trophy' },
  { icon: 'mdi:flag-checkered' },
  { icon: 'mdi:target' },
  { icon: 'mdi:star' },
  { icon: 'mdi:lightning-bolt' },
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
