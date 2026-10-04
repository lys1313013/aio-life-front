// 展示信息只补充已知工具；未知工具仍使用服务端名称与描述。
export const toolGroups = [
  { value: 'all', label: '全部' },
  { value: 'time', label: '时迹与想法' },
  { value: 'plan', label: '目标与待办' },
  { value: 'learn', label: '阅读与学习' },
  { value: 'life', label: '生活总览' },
  { value: 'other', label: '其他' },
];

const catalog: Record<
  string,
  { group: string; summary: string; title: string }
> = {
  anniversary_query: {
    title: '纪念日与倒数日',
    summary: '查看重要日子，以及距离下一次到来的天数',
    group: 'life',
  },
  b_video_query: {
    title: '学习视频',
    summary: '查询 B 站视频与学习进度',
    group: 'learn',
  },
  b_video_statistics: {
    title: '学习统计',
    summary: '汇总视频学习时长、进度与完成情况',
    group: 'learn',
  },
  dashboard_cards: {
    title: '生活仪表盘',
    summary: '读取当前可见卡片的数据概览',
    group: 'life',
  },
  douban_wishlist_add: {
    title: '添加想看 / 想读',
    summary: '通过豆瓣链接收藏电影或书籍',
    group: 'learn',
  },
  goal_query: {
    title: '目标与进度',
    summary: '查询目标、子目标及完成情况',
    group: 'plan',
  },
  goal_progress_update: {
    title: '更新目标进展',
    summary: '调整目标的进度或状态',
    group: 'plan',
  },
  movie_query: {
    title: '观影记录',
    summary: '查询电影、剧集与观看进度',
    group: 'learn',
  },
  read_record_query: {
    title: '阅读记录',
    summary: '查询书籍与阅读进度',
    group: 'learn',
  },
  time_record_queryByDateRange: {
    title: '查询时迹',
    summary: '按日期范围查看时间记录与运动明细',
    group: 'time',
  },
  time_tracker_category_list: {
    title: '时迹分类',
    summary: '查看个人分类与公共分类',
    group: 'time',
  },
  thought_save: {
    title: '记录想法',
    summary: '保存灵感与想法，关联相关事件',
    group: 'time',
  },
  task_list: {
    title: '待办列表',
    summary: '查看任务列表及其标识',
    group: 'plan',
  },
  time_record_save: {
    title: '记录时迹',
    summary: '保存一段时间记录',
    group: 'time',
  },
  task_detail_save: {
    title: '添加待办',
    summary: '向任务列表录入一条明细',
    group: 'plan',
  },
};

export function toolPresentation(tool: { description?: string; name: string }) {
  return (
    catalog[tool.name] || {
      title: tool.name,
      summary: tool.description || '',
      group: 'other',
    }
  );
}
