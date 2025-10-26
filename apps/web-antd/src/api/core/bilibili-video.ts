import { requestClient } from '#/api/request';

/**
 * B站视频学习记录接口
 */
export interface BilibiliVideo {
  id?: string;
  title: string; // 视频标题
  url: string; // B站视频URL
  cover?: string; // 视频封面
  duration?: number; // 视频时长
  watchedDuration?: number; // 已学习时长
  episodes?: number; // 集数
  currentEpisode?: number; // 当前观看集数
  progress?: number; // 观看进度（百分比）
  status: 'completed' | 'in-progress' | 'watched'; // 状态：已学完、进行中、已学过
  lastWatched?: string; // 最后观看时间
  addedAt?: string; // 添加时间
  notes?: string; // 学习笔记

  // 从B站API获取的额外信息
  bvid?: string; // BV号
  aid?: string; // AV号
  description?: string; // 视频描述
  owner?: {
    mid: number; // UP主ID
    name: string; // UP主名称
    face: string; // UP主头像
  };
  stat?: {
    view: number; // 播放量
    danmaku: number; // 弹幕数
    reply: number; // 评论数
    favorite: number; // 收藏数
    coin: number; // 投币数
    share: number; // 分享数
    like: number; // 点赞数
  };
  pubdate?: string; // 发布时间
  ctime?: string; // 创建时间
  tname?: string; // 分区名称
  tname_v2?: string; // 新版分区名称
  copyright?: number; // 版权信息
  dimension?: {
    width: number;
    height: number;
    rotate: number;
  };
  pages?: Array<{
    cid: number;
    page: number;
    part: string;
    duration: number;
  }>;
}

/**
 * 查询学习视频列表
 */
export async function query(data: any) {
  return await requestClient.post('/bilibili-video/query', data);
}

/**
 * 查询各个状态的数量
 */
export async function getStatusCount(data: any) {
  return await requestClient.get('/bilibili-video/getStatusCount', data);
}

/**
 * 新增或更新学习视频
 */
export async function insertOrUpdateBilibiliVideo(data: BilibiliVideo) {
  return await requestClient.post('/bilibili-video/insertOrUpdate', data);
}

/**
 * 删除学习视频
 */
export async function deleteBilibiliVideo(data: any) {
  return await requestClient.post('/bilibili-video/delete', data);
}

export async function statistics(data: any) {
  return await requestClient.get('/bilibili-video/statistics', data);
}

/**
 * 清理URL参数，只保留p和t参数
 */
function cleanUrlParams(url: string): string {
  try {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);

    // 只保留p和t参数
    const allowedParams = ['p', 't'];
    const newParams = new URLSearchParams();

    for (const key of allowedParams) {
      if (params.has(key)) {
        newParams.set(key, params.get(key) as string);
      }
    }

    // 构建新的URL
    urlObj.search = newParams.toString();
    return urlObj.toString();
  } catch (error) {
    // 如果URL解析失败，返回原始URL
    console.warn('URL解析失败，返回原始URL:', error);
    return url;
  }
}

/**
 * 解析URL中的集数参数
 */
function parseEpisodeFromUrl(url: string): number {
  // 匹配p=数字格式的参数
  const episodeMatch = url.match(/[?&]p=(\d+)/);
  if (episodeMatch && episodeMatch[1]) {
    return parseInt(episodeMatch[1], 10);
  }
  return 1; // 默认第一集
}

/**
 * 计算学习进度（当前集数到以前的时长 / 视频总时长）
 */
function calculateProgress(currentEpisode: number, totalEpisodes: number): number {
  if (totalEpisodes <= 0 || currentEpisode <= 0) {
    return 0;
  }

  if (currentEpisode >= totalEpisodes) {
    return 100;
  }

  // 计算进度百分比：当前集数到以前的时长占总时长的比例
  // 假设每集时长相等，进度 = (当前集数 - 1) / 总集数 * 100
  const progress = Math.max(0, Math.min(100, ((currentEpisode - 1) / totalEpisodes) * 100));
  return Math.round(progress);
}

/**
 * 计算已观看视频时长（秒）
 */
function calculateWatchedDuration(currentEpisode: number, totalEpisodes: number, totalDurationSeconds: number, pages?: Array<{page: number, duration: number}>): number {
  if (totalEpisodes <= 0 || currentEpisode <= 0 || totalDurationSeconds <= 0) {
    return 0;
  }

  if (currentEpisode >= totalEpisodes) {
    return totalDurationSeconds; // 已观看全部时长
  }

  // 如果有分P时长数据，基于实际分P时长计算
  if (pages && pages.length > 0) {
    let watchedSeconds = 0;
    // 累加当前集数之前的所有分P时长
    for (let i = 0; i < Math.min(currentEpisode - 1, pages.length); i++) {
      watchedSeconds += pages[i].duration;
    }
    return Math.max(0, Math.min(totalDurationSeconds, watchedSeconds));
  }

  // 如果没有分P时长数据，假设每集时长相等
  const watchedSeconds = Math.max(0, Math.min(totalDurationSeconds, ((currentEpisode - 1) / totalEpisodes) * totalDurationSeconds));
  return Math.round(watchedSeconds);
}

/**
 * 格式化时长（秒转时分秒）
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

/**
 * 解析B站视频URL，获取视频信息（前端跨域解决方案）
 */
export async function parseBilibiliUrl(url: string) {
  // 验证URL格式
  if (!url) {
    return { success: false, message: 'URL不能为空' };
  }

  // 提取BV号或av号
  let bvid = '';
  let aid = '';

  // 匹配BV号格式
  const bvMatch = url.match(/[Bb][Vv]([a-zA-Z0-9]{10})/);
  if (bvMatch) {
    bvid = bvMatch[0];
  }

  // 匹配av号格式
  const avMatch = url.match(/[Aa][Vv](\d+)/);
  if (avMatch) {
    aid = avMatch[1];
  }

  if (!bvid && !aid) {
    return { success: false, message: '无法识别B站视频URL格式' };
  }

  try {
    // 方案1: 使用JSONP方式（推荐，无跨域问题）
    const videoInfo = await parseWithJsonp(bvid, aid);

    if (videoInfo) {
      // 解析URL中的集数
      const currentEpisode = parseEpisodeFromUrl(url);

      // 自动计算学习进度
      const progress = calculateProgress(currentEpisode, videoInfo.episodes || 1);

      // 计算已观看视频时长（秒）
      const totalDurationSeconds = videoInfo.duration || 0;
      const watchedDurationSeconds = calculateWatchedDuration(currentEpisode, videoInfo.episodes || 1, totalDurationSeconds, videoInfo.pages);
      const watchedDurationFormatted = formatDuration(watchedDurationSeconds);

      // 清理URL参数，只保留p和t参数
      const cleanedUrl = cleanUrlParams(url);

      return {
        success: true,
        data: {
          ...videoInfo,
          url: cleanedUrl, // 使用清理后的URL
          currentEpisode,
          progress,
          watchedDuration: watchedDurationSeconds,
          watchedDurationFormatted,
        },
        message: '解析成功'
      };
    }

    // 方案2: 使用CORS代理（备选方案）
    const corsResult = await parseWithCorsProxy(bvid, aid);
    if (corsResult.success) {
      // 解析URL中的集数
      const currentEpisode = parseEpisodeFromUrl(url);

      // 自动计算学习进度
      const progress = calculateProgress(currentEpisode, corsResult.data.episodes || 1);

      // 计算已观看视频时长（秒）
      const totalDurationSeconds = corsResult.data.duration || 0;
      const watchedDurationSeconds = calculateWatchedDuration(currentEpisode, corsResult.data.episodes || 1, totalDurationSeconds, corsResult.data.pages);
      const watchedDurationFormatted = formatDuration(watchedDurationSeconds);

      // 清理URL参数，只保留p和t参数
      const cleanedUrl = cleanUrlParams(url);

      return {
        success: true,
        data: {
          ...corsResult.data,
          url: cleanedUrl, // 使用清理后的URL
          currentEpisode,
          progress,
          watchedDuration: watchedDurationSeconds,
          watchedDurationFormatted
        },
        message: '解析成功'
      };
    }

    return corsResult;

  } catch (error) {
    console.error('B站API调用失败:', error);
    return {
      success: false,
      message: '解析失败：' + (error instanceof Error ? error.message : '未知错误')
    };
  }
}

/**
 * 使用JSONP方式解析（无跨域限制）
 */
async function parseWithJsonp(bvid: string, aid: string): Promise<any> {
  return new Promise((resolve) => {
    // 创建script标签进行JSONP请求
    const script = document.createElement('script');

    // 生成回调函数名
    const callbackName = 'bilibiliCallback_' + Date.now();

    // 构建JSONP URL
    let jsonpUrl = '';
    if (bvid) {
      jsonpUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}&callback=${callbackName}&jsonp=jsonp`;
    } else if (aid) {
      jsonpUrl = `https://api.bilibili.com/x/web-interface/view?aid=${aid}&callback=${callbackName}&jsonp=jsonp`;
    }

    // 设置全局回调函数
    (window as any)[callbackName] = (data: any) => {
      // 清理script标签
      document.head.removeChild(script);
      delete (window as any)[callbackName];

      if (data && data.code === 0) {
        resolve(formatVideoInfo(data.data));
      } else {
        resolve(null);
      }
    };

    // 设置超时处理
    const timeout = setTimeout(() => {
      document.head.removeChild(script);
      delete (window as any)[callbackName];
      resolve(null);
    }, 10000);

    // 修改回调函数以清除超时
    const originalCallback = (window as any)[callbackName];
    (window as any)[callbackName] = (data: any) => {
      clearTimeout(timeout);
      originalCallback(data);
    };

    script.src = jsonpUrl;
    document.head.appendChild(script);
  });
}

/**
 * 使用CORS代理（备选方案）
 */
async function parseWithCorsProxy(bvid: string, aid: string): Promise<any> {
  // 使用公共CORS代理
  let apiUrl = '';
  if (bvid) {
    apiUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
  } else if (aid) {
    apiUrl = `https://api.bilibili.com/x/web-interface/view?aid=${aid}`;
  }

  // 使用cors.sh代理
  const proxyUrl = `https://cors.sh/${apiUrl}`;

  const response = await fetch(proxyUrl, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://www.bilibili.com'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();

  if (result.code !== 0) {
    throw new Error(`B站API错误: ${result.message}`);
  }

  return {
    success: true,
    data: formatVideoInfo(result.data),
    message: '解析成功'
  };
}

/**
 * 格式化视频信息
 */
function formatVideoInfo(data: any) {
  return {
    title: data.title || '',
    cover: data.pic || 'https://via.placeholder.com/300x200?text=B站视频封面',
    duration: data.duration || 0,
    episodes: data.videos || 1,
    // 添加更多API返回的信息
    bvid: data.bvid || '',
    aid: data.aid || '',
    description: data.desc || '',
    owner: data.owner ? {
      mid: data.owner.mid,
      name: data.owner.name,
      face: data.owner.face
    } : null,
    stat: data.stat ? {
      view: data.stat.view,
      danmaku: data.stat.danmaku,
      reply: data.stat.reply,
      favorite: data.stat.favorite,
      coin: data.stat.coin,
      share: data.stat.share,
      like: data.stat.like
    } : null,
    pubdate: data.pubdate ? new Date(data.pubdate * 1000).toLocaleString() : '',
    ctime: data.ctime ? new Date(data.ctime * 1000).toLocaleString() : '',
    tname: data.tname || '',
    tname_v2: data.tname_v2 || '',
    copyright: data.copyright || 1,
    dimension: data.dimension || null,
    pages: data.pages || []
  };
}
