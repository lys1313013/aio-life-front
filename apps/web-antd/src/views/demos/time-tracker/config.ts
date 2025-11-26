import type { TimeTrackerConfig, TimeSlotCategory } from './types';

// 默认时间段分类
export const defaultCategories: TimeSlotCategory[] = [
   {
    id: 'project',
    name: '项目',
    color: '#eb2f96',
  },
  {
    id: 'study',
    name: '学习',
    color: '#52c41a',
  },
  {
    id: 'work',
    name: '工作',
    color: '#1890ff',
  },
  {
    id: 'rest',
    name: '休息',
    color: '#faad14',
  },
  {
    id: 'entertainment',
    name: '娱乐',
    color: '#722ed1',
  },
  {
    id: 'exercise',
    name: '运动',
    color: '#f50',
  },
  {
    id: 'eat',
    name: '吃饭',
    color: '#fa541c',
  },
  {
    id: 'wash',
    name: '洗漱',
    color: '#13c2c2',
  },
  {
    id: 'commuting',
    name: '通勤',
    color: '#eb2f96',
  },
  {
    id: 'finance-investment',
    name: '理财',
    color: '#fa8c16',
  },
  {
    id: 'other',
    name: '其他',
    color: '#d9d9d9',
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
