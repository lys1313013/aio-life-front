// 关系类型颜色映射（图例与画布共用）
export const RELATION_COLORS: Record<string, string> = {
  父母: '#e91e63',
  母亲: '#e91e63',
  父亲: '#e91e63',
  子女: '#4caf50',
  配偶: '#ff9800',
  恋人: '#ff5722',
  兄弟姐妹: '#9c27b0',
  朋友: '#2196f3',
  挚友: '#00bcd4',
  同学: '#009688',
  同事: '#607d8b',
  老师: '#795548',
  学生: '#8bc34a',
  mentor: '#3f51b5',
  前任: '#f44336',
  暗恋: '#e91e63',
  其他: '#9e9e9e',
};

export const DEFAULT_RELATION_COLOR = '#9e9e9e';

export function getRelationColor(type?: string): string {
  return (type && RELATION_COLORS[type]) || DEFAULT_RELATION_COLOR;
}

// 人物分类颜色映射（筛选 chips 与画布节点共用）
export const CATEGORY_COLORS: Record<string, string> = {
  亲属: '#f43f5e',
  社会: '#3b82f6',
  情感: '#a855f7',
  其他: '#94a3b8',
};

export const DEFAULT_CATEGORY_COLOR = '#6366f1';

export function getCategoryColor(category?: string): string {
  return (category && CATEGORY_COLORS[category]) || DEFAULT_CATEGORY_COLOR;
}
