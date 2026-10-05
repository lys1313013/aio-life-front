import type { Dayjs } from 'dayjs';

// 分类预设
export const CATEGORIES = [
  { value: 'video', label: '视频', icon: 'mdi:movie-open-outline' },
  { value: 'music', label: '音乐', icon: 'mdi:music-note-eighth' },
  { value: 'shopping', label: '购物', icon: 'mdi:shopping-outline' },
  { value: 'cloud', label: '云盘', icon: 'mdi:cloud-outline' },
  { value: 'study', label: '学习', icon: 'mdi:book-open-outline' },
  { value: 'game', label: '游戏', icon: 'mdi:gamepad-variant-outline' },
  { value: 'AI', label: 'AI', icon: 'lucide:sparkle' },
  { value: 'other', label: '其他', icon: 'mdi:shape-outline' },
];

export const COLOR_PRESETS = [
  '#1677ff',
  '#52c41a',
  '#faad14',
  '#f5222d',
  '#722ed1',
  '#13c2c2',
  '#eb2f96',
  '#8c8c8c',
];

// 到期日期快捷选项（基于开通日期计算，未填开通日期则基于今天）
export const QUICK_DATES = [
  { label: '1月', getDate: (base: Dayjs) => base.add(1, 'month') },
  { label: '1季度', getDate: (base: Dayjs) => base.add(3, 'month') },
  { label: '半年', getDate: (base: Dayjs) => base.add(6, 'month') },
  { label: '1年', getDate: (base: Dayjs) => base.add(1, 'year') },
];

export const BILLING_CYCLES = [
  { value: 'week', label: '周' },
  { value: 'two_weeks', label: '两周' },
  { value: 'month', label: '月' },
  { value: 'quarter', label: '季' },
  { value: 'half_year', label: '半年' },
  { value: 'year', label: '年' },
];
