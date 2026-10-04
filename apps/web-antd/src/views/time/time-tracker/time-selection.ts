// 起止分钟是闭区间；固定另一端，仅允许同一连续空闲区间内的时间。
interface TimeRange {
  id?: string;
  date?: string;
  startTime: number;
  endTime: number;
}

export function timeSelectionBounds(
  record: TimeRange,
  existing: TimeRange[],
  field: 'endTime' | 'startTime',
) {
  const anchor = field === 'startTime' ? record.endTime : record.startTime;
  let max = 1439;
  let min = 0;
  for (const item of existing) {
    if (
      (record.id && item.id === record.id) ||
      (item.date && item.date !== record.date)
    )
      continue;
    if (item.startTime <= anchor && item.endTime >= anchor)
      return { min: 1, max: 0 };
    if (item.endTime < anchor) min = Math.max(min, item.endTime + 1);
    if (item.startTime > anchor) max = Math.min(max, item.startTime - 1);
  }
  return field === 'startTime'
    ? { min, max: Math.min(max, anchor) }
    : { min: Math.max(min, anchor), max };
}

export function clampTimeSelection(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
