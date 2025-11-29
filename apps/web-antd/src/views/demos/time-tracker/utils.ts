import type { TimeSlot, TimeTrackerConfig } from './types';

// 将分钟转换为时间字符串（HH:MM）
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// 将时间字符串转换为分钟
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// 验证时间段是否重叠
export function hasOverlap(slots: TimeSlot[], newSlot: TimeSlot): boolean {
  return slots.some(slot => {
    if (slot.id === newSlot.id) return false; // 排除自身
    return newSlot.startTime < slot.endTime && newSlot.endTime > slot.startTime;
  });
}

// 验证时间段是否重叠（编辑时使用，排除指定ID的时间段）
export function hasOverlapExcluding(slots: TimeSlot[], newSlot: TimeSlot, excludeId?: string): boolean {
  return slots.some(slot => {
    if (slot.id === excludeId) return false; // 排除指定ID的时间段
    return newSlot.startTime < slot.endTime && newSlot.endTime > slot.startTime;
  });
}

// 检测指定时间段下方的第一个时间段
// 返回下方时间段的开始时间，如果没有下方时间段则返回null
export function getBelowSlotStartTime(slots: TimeSlot[], currentSlot: TimeSlot, excludeId?: string): number | null {
  // 过滤掉当前时间段本身
  const otherSlots = slots.filter(slot => slot.id !== currentSlot.id && (!excludeId || slot.id !== excludeId) && slot.date === currentSlot.date);

  // 找到所有在当前时间段下方的时段（开始时间大于当前时间段的结束时间）
  const belowSlots = otherSlots.filter(slot => slot.startTime >= currentSlot.endTime);

  if (belowSlots.length === 0) {
    return null; // 没有下方时间段
  }

  // 找到最接近的下方时间段（开始时间最小的下方时间段）
  const closestBelowSlot = belowSlots.reduce((closest, slot) => {
    return slot.startTime < closest.startTime ? slot : closest;
  });

  return closestBelowSlot.startTime;
}

// 检测指定时间段上方的第一个时间段
// 返回上方时间段的结束时间，如果没有上方时间段则返回null
export function getAboveSlotEndTime(slots: TimeSlot[], currentSlot: TimeSlot, excludeId?: string): number | null {
  const otherSlots = slots.filter(slot => slot.id !== currentSlot.id && (!excludeId || slot.id !== excludeId) && slot.date === currentSlot.date);
  const aboveSlots = otherSlots.filter(slot => slot.endTime <= currentSlot.startTime);

  if (aboveSlots.length === 0) {
    return null;
  }

  // 找到最接近的上方时间段（结束时间最大的上方时间段）
  const closestAboveSlot = aboveSlots.reduce((closest, slot) => {
    return slot.endTime > closest.endTime ? slot : closest;
  });

  return closestAboveSlot.endTime;
}

// 验证时间段是否有效
export function isValidSlot(slot: TimeSlot, config: TimeTrackerConfig): boolean {
  return (
    slot.startTime >= 0 &&
    slot.endTime <= 1439 &&
    slot.startTime < slot.endTime
  );
}

// 获取时间段在时间轴上的位置和高度
export function getSlotPosition(slot: TimeSlot, containerHeight: number) {
  const totalMinutes = 1440; // 24小时
  const top = (slot.startTime / totalMinutes) * containerHeight;
  const height = ((slot.endTime - slot.startTime) / totalMinutes) * containerHeight;
  return { top, height };
}

// 根据鼠标位置计算时间
export function getTimeFromPosition(y: number, containerHeight: number): number {
  const totalMinutes = 1440;
  return Math.min(1439, Math.round((y / containerHeight) * totalMinutes));
}

// 对齐时间到最近的15分钟间隔
export function snapToGrid(time: number, gridSize: number = 15): number {
  return Math.round(time / gridSize) * gridSize;
}

// 生成唯一ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 格式化时间段显示
export function formatSlotTime(slot: TimeSlot): string {
  return `${minutesToTime(slot.startTime)} - ${minutesToTime(slot.endTime)}`;
}

// 计算时间段时长（分钟）
export function getSlotDuration(slot: TimeSlot): number {
  return slot.endTime - slot.startTime;
}

// 格式化时长显示
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
  }
  return `${mins}m`;
}
