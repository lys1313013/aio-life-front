// 时间段类型定义
export interface TimeSlot {
  id: string;
  startMinute: number; // 开始分钟（0-1439，包含）
  endMinute: number; // 结束分钟（0-1439，包含）；时长 = endMinute - startMinute + 1
  categoryId: string; // 分类ID
  title?: string; // 标题
  description?: string; // 描述
  color?: string; // 颜色
  date: string; // 日期（YYYY-MM-DD格式）
  exercises?: ExerciseDetail[]; // 多个运动明细
  relateId?: string; // 关联业务ID
  relateType?: number; // 关联业务类型：1-阅读，2-观影
}

export interface ExerciseDetail {
  id?: string;
  exerciseTypeId: string;
  exerciseCount?: number;
  description?: string;
}

// 时间段分类
export interface TimeSlotCategory {
  id: string;
  parentId?: null | string;
  inheritParent?: boolean;
  isHidden?: boolean;
  sortOrder?: number;
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
    sortOrder?: number;
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
  sortOrder: number;
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
  startMinute: number;
  endMinute: number;
  categoryId: string;
  title?: string;
  description?: string;
  exercises?: ExerciseDetail[];
  relateId?: string;
  relateType?: number;
}

// 拖拽操作类型
export interface DragOperation {
  type: 'create' | 'move' | 'resize';
  slotId?: string;
  startX?: number;
  startY: number;
  startMinute: number;
  currentTime: number;
  direction?: 'bottom' | 'top';
  originalStart?: number;
  originalEnd?: number;
  changed?: boolean;
}
