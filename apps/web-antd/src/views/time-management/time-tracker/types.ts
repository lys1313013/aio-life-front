// 时间段类型定义
export interface TimeSlot {
  id: string;
  startTime: number; // 开始时间（分钟，0-1440）
  endTime: number; // 结束时间（分钟，0-1440）
  categoryId: string; // 分类ID
  title?: string; // 标题
  description?: string; // 描述
  color?: string; // 颜色
  date: string; // 日期（YYYY-MM-DD格式）
  exercises?: ExerciseDetail[]; // 多个运动明细
}

export interface ExerciseDetail {
  exerciseTypeId: string;
  exerciseCount?: number;
}

// 时间段分类
export interface TimeSlotCategory {
  id: string;
  name: string;
  color: string;
  icon?: string; // 图标名称(Iconify格式)
  description?: string;
  isTrackTime?: boolean;
  // 新增字段
  categoryType?: 'private' | 'public'; // 分类来源类型
  originalId?: string; // 原始公共分类ID（仅覆盖记录）
  originalName?: string; // 原始公共分类名称
  isOverridden?: boolean; // 是否被当前用户覆盖
}

// 合并后的分类列表（用于前端展示）
export interface MergedCategory extends TimeSlotCategory {
  realId?: string; // 真实的数据库主键 ID
  isHidden: boolean; // 是否被当前用户隐藏
  overrideFields?: {
    color?: string;
    icon?: string; // 图标字段
    name?: string;
    sort?: number;
  };
}

// 分类配置项（用于表单）
export interface CategoryConfigItem {
  id?: string;
  templateId?: null | string;
  name: string;
  color: string;
  icon?: string; // 图标名称(Iconify格式)
  description?: string;
  isTrackTime: boolean;
  sort: number;
  categoryType: 'override' | 'private' | 'public';
  originalPublicId?: string; // 原始公共分类ID
}

// 时间轴配置
export interface TimeTrackerConfig {
  categories: TimeSlotCategory[];
  defaultCategoryId: string;
  minSlotDuration: number; // 最小时间段时长（分钟）
  maxSlotDuration: number; // 最大时间段时长（分钟）
}

// 编辑表单数据
export interface TimeSlotFormData {
  id?: string;
  startTime: number;
  endTime: number;
  categoryId: string;
  title?: string;
  description?: string;
  exercises?: ExerciseDetail[];
}

// 拖拽操作类型
export interface DragOperation {
  type: 'create' | 'move' | 'resize';
  slotId?: string;
  startX?: number;
  startY: number;
  startTime: number;
  currentTime: number;
  direction?: 'bottom' | 'top';
  originalStart?: number;
  originalEnd?: number;
  changed?: boolean;
}
