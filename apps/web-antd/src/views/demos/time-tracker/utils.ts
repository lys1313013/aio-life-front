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
    return !(newSlot.endTime <= slot.startTime || newSlot.startTime >= slot.endTime);
  });
}

// 验证时间段是否有效
export function isValidSlot(slot: TimeSlot, config: TimeTrackerConfig): boolean {
  const duration = slot.endTime - slot.startTime;
  return (
    slot.startTime >= 0 &&
    slot.endTime <= 1440 &&
    slot.startTime < slot.endTime &&
    duration >= config.minSlotDuration &&
    duration <= config.maxSlotDuration
  );
}

// 获取时间段在时间轴上的位置和宽度
export function getSlotPosition(slot: TimeSlot, containerWidth: number) {
  const totalMinutes = 1440; // 24小时
  const left = (slot.startTime / totalMinutes) * containerWidth;
  const width = ((slot.endTime - slot.startTime) / totalMinutes) * containerWidth;
  return { left, width };
}

// 根据鼠标位置计算时间
export function getTimeFromPosition(x: number, containerWidth: number): number {
  const totalMinutes = 1440;
  return Math.round((x / containerWidth) * totalMinutes);
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
    return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
  }
  return `${mins}分钟`;
}