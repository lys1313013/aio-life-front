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
  exerciseTypeId?: string; // 运动类型ID
  exerciseCount?: number; // 运动次数
}

// 时间段分类
export interface TimeSlotCategory {
  id: string;
  name: string;
  color: string;
  description?: string;
  isTrackTime?: boolean;
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
  exerciseTypeId?: string;
  exerciseCount?: number;
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
