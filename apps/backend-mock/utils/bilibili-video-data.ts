// 共享的视频数据存储
export let videos = [
  {
    id: '1',
    title: 'Vue3 入门教程',
    url: 'https://www.bilibili.com/video/BV1Zy4y1K7SH',
    cover: 'https://example.com/cover1.jpg',
    duration: 9015, // 2:30:15 = 9015秒
    episodes: 10,
    currentEpisode: 5,
    progress: 50,
    status: 'in-progress',
    lastWatched: '2024-01-15',
    addedAt: '2024-01-10',
    notes: '正在学习Vue3的基础语法',
    ownerName: '技术博主小张',
    watchedDuration: 4507 // 已学习时长（秒数），基于当前集数计算
  },
  {
    id: '2',
    title: 'React 高级技巧',
    url: 'https://www.bilibili.com/video/BV1aV411t7V3',
    cover: 'https://example.com/cover2.jpg',
    duration: 13520, // 3:45:20 = 13520秒
    episodes: 15,
    currentEpisode: 15,
    progress: 100,
    status: 'completed',
    lastWatched: '2024-01-20',
    addedAt: '2024-01-12',
    notes: '已经学完React高级技巧',
    ownerName: '前端开发老王',
    watchedDuration: 13520 // 已学习时长（秒数），已完成全部视频
  }
];

// 获取下一个ID
export function getNextId() {
  return Math.max(...videos.map(v => parseInt(v.id)), 0) + 1;
}