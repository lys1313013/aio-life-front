import type { TimeTrackerConfig, TimeSlotCategory } from './types';

// 默认时间段分类
export const defaultCategories: TimeSlotCategory[] = [];

// 默认配置
export const defaultConfig: TimeTrackerConfig = {
  categories: defaultCategories,
  defaultCategoryId: '',
  minSlotDuration: 15, // 15分钟
  maxSlotDuration: 480, // 8小时
};

// 获取分类颜色
export function getCategoryColor(categoryId: string, categories: TimeSlotCategory[]): string {
  const category = categories.find(cat => cat.id === categoryId);
  return category?.color || '#d9d9d9';
}

// 获取分类名称
export function getCategoryName(categoryId: string, categories: TimeSlotCategory[]): string {
  const category = categories.find(cat => cat.id === categoryId);
  return category?.name || '未知';
}
