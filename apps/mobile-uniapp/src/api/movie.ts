import { get, post, put, del } from "../utils/request";

export namespace MovieApi {
  export interface MovieQuery {
    title?: string;
    type?: number;
    status?: number;
    current?: number;
    size?: number;
  }

  export interface MovieVO {
    id: string;
    title: string;
    type: number;
    director: string;
    url: string;
    coverImg: string;
    status: number;
    totalProgress: number;
    currentProgress: number;
    startTime: string;
    finishTime: string;
    remark: string;
    createTime: string;
    updateTime: string;
  }

  export interface MovieReq {
    id?: string;
    title: string;
    type: number;
    director?: string;
    url?: string;
    coverImg?: string;
    status?: number;
    totalProgress?: number;
    currentProgress?: number;
    startTime?: string;
    finishTime?: string;
    remark?: string;
  }

  export function pageList(data: MovieQuery) {
    return post<any>('/movie/page', data);
  }

  export function save(data: MovieReq) {
    return post('/movie', data);
  }

  export function update(data: MovieReq) {
    return put('/movie', data);
  }

  export function remove(id: string) {
    return del(`/movie/${id}`);
  }

  export function parseDouban(url: string) {
    return get<MovieReq>('/movie/parse-douban', { url });
  }

  export function listActive() {
    return get<MovieVO[]>('/movie/active');
  }
}
