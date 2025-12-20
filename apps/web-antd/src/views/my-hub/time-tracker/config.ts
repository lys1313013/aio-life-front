import type { TimeTrackerConfig, TimeSlotCategory } from './types';

// 默认时间段分类
export const defaultCategories: TimeSlotCategory[] = [
  {
    id: 'project',
    name: '项目',
    color: '#722ed1', // purple-6
  },
  {
    id: 'study',
    name: '学习',
    color: '#52c41a', // green-6
  },
  {
    id: 'work',
    name: '工作',
    color: '#1677ff', // blue-6
  },
  {
    id: 'rest',
    name: '休息',
    color: '#faad14', // gold-6
  },
  {
    id: 'entertainment',
    name: '娱乐',
    color: '#eb2f96', // magenta-6
  },
  {
    id: 'exercise',
    name: '运动',
    color: '#fa541c', // volcano-6
  },
  {
    id: 'eat',
    name: '吃饭',
    color: '#fa8c16', // orange-6
  },
  {
    id: 'wash',
    name: '洗漱',
    color: '#13c2c2', // cyan-6
  },
  {
    id: 'commuting',
    name: '交通',
    color: '#2f54eb', // geekblue-6
  },
  {
    id: 'finance-investment',
    name: '理财',
    color: '#f5222d', // red-6
  },
  {
    id: 'other',
    name: '其他',
    color: '#bfbfbf', // grey-6
  }
];

// 默认配置
export const defaultConfig: TimeTrackerConfig = {
  categories: defaultCategories,
  defaultCategoryId: 'study',
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
