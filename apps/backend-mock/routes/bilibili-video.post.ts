import { defineEventHandler, readBody } from 'h3';
import { videos } from '../utils/bilibili-video-data';

// 查询视频列表
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { page = 1, pageSize = 50, condition = {} } = body;
  
  // 过滤数据
  let filteredVideos = videos;
  if (condition.status) {
    filteredVideos = filteredVideos.filter(video => video.status === condition.status);
  }
  
  // 分页
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedVideos = filteredVideos.slice(start, end);
  
  return {
    success: true,
    items: paginatedVideos,
    total: filteredVideos.length,
    page,
    pageSize
  };
});