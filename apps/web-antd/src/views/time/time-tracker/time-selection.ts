// 起止分钟是闭区间；固定另一端，仅允许同一连续空闲区间内的时间。
interface TimeRange {
  id?: string;
  date?: string;
  startMinute: number;
  endMinute: number;
}

export function timeSelectionBounds(
  record: TimeRange,
  existing: TimeRange[],
  field: 'endMinute' | 'startMinute',
) {
  const anchor =
    field === 'startMinute' ? record.endMinute : record.startMinute;
  let max = 1439;
  let min = 0;
  for (const item of existing) {
    if (
      (record.id && item.id === record.id) ||
      (item.date && item.date !== record.date)
    )
      continue;
    if (item.startMinute <= anchor && item.endMinute >= anchor)
      return { min: 1, max: 0 };
    if (item.endMinute < anchor) min = Math.max(min, item.endMinute + 1);
    if (item.startMinute > anchor) max = Math.min(max, item.startMinute - 1);
  }
  return field === 'startMinute'
    ? { min, max: Math.min(max, anchor) }
    : { min: Math.max(min, anchor), max };
}

export function clampTimeSelection(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
