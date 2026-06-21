import { get, post, put, del } from "../utils/request";

export interface BilibiliVideo {
  id?: string;
  title: string;
  url: string;
  cover?: string;
  duration?: number;
  watchedDuration?: number;
  episodes?: number;
  currentEpisode?: number;
  progress?: number;
  status: 'completed' | 'in-progress' | 'watched';
  lastWatched?: string;
  addedAt?: string;
  notes?: string;
  bvid?: string;
  aid?: string;
  description?: string;
  owner?: {
    face: string;
    mid: number;
    name: string;
  };
  stat?: {
    coin: number;
    danmaku: number;
    favorite: number;
    like: number;
    reply: number;
    share: number;
    view: number;
  };
  pubdate?: string;
  ctime?: string;
  tname?: string;
  tname_v2?: string;
  copyright?: number;
  dimension?: {
    height: number;
    rotate: number;
    width: number;
  };
  pages?: Array<{
    cid: number;
    duration: number;
    page: number;
    part: string;
  }>;
}

export async function query(data: any) {
  return await post('/b-video/query', data);
}

export async function getStatusCount(data?: any) {
  return await get('/b-video/getStatusCount', data);
}

export async function insertBVideo(data: BilibiliVideo) {
  return await post('/b-video', data);
}

export async function updateBiVideo(id: string, data: BilibiliVideo) {
  return await put(`/b-video/${id}`, data);
}

export async function deleteBilibiliVideo(id: string) {
  return await del(`/b-video/${id}`);
}

export async function statistics(data?: any) {
  return await get('/b-video/statistics', data);
}
