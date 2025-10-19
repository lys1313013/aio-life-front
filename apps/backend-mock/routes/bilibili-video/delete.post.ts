import { defineEventHandler, readBody } from 'h3';
import { videos } from '../../utils/bilibili-video-data';

// 删除视频
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { id } = body;
  
  const index = videos.findIndex(video => video.id === id);
  if (index !== -1) {
    videos.splice(index, 1);
    return {
      success: true,
      message: '删除成功'
    };
  } else {
    return {
      success: false,
      message: '视频不存在'
    };
  }
});