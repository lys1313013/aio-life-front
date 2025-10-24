import type { TimeTrackerConfig, TimeSlotCategory } from './types';

// 默认时间段分类
export const defaultCategories: TimeSlotCategory[] = [
  {
    id: 'work',
    name: '工作',
    color: '#1890ff',
    description: '工作时间'
  },
  {
    id: 'study',
    name: '学习',
    color: '#52c41a',
    description: '学习时间'
  },
  {
    id: 'rest',
    name: '休息',
    color: '#faad14',
    description: '休息时间'
  },
  {
    id: 'entertainment',
    name: '娱乐',
    color: '#722ed1',
    description: '娱乐时间'
  },
  {
    id: 'exercise',
    name: '运动',
    color: '#f50',
    description: '运动时间'
  },
  {
    id: 'other',
    name: '其他',
    color: '#d9d9d9',
    description: '其他时间'
  }
];

// 默认配置
export const defaultConfig: TimeTrackerConfig = {
  categories: defaultCategories,
  defaultCategoryId: 'work',
  minSlotDuration: 15, // 15分钟
  maxSlotDuration: 480 // 8小时
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