import { defineEventHandler, readBody } from 'h3';
import { videos, getNextId } from '../../utils/bilibili-video-data';

// 新增或更新视频
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  
  if (body.id) {
    // 更新现有视频
    const index = videos.findIndex(video => video.id === body.id);
    if (index !== -1) {
      videos[index] = { ...videos[index], ...body };
      return {
        success: true,
        message: '更新成功',
        data: videos[index]
      };
    } else {
      return {
        success: false,
        message: '视频不存在'
      };
    }
  } else {
    // 新增视频
    const newVideo = {
      id: getNextId().toString(),
      ...body,
      addedAt: new Date().toISOString().split('T')[0]
    };
    videos.push(newVideo);
    
    return {
      success: true,
      message: '新增成功',
      data: newVideo
    };
  }
});