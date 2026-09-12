import { getQuery } from '@/utils/query';
import { request, post } from '../utils/request';

export function query(data: any = {}) {
  return getQuery('/device/query', data);
}

export function insertOrUpdate(data: any) {
  return post('/device/insertOrUpdate', data);
}

export function deleteData(id: number | string) {
  return request({ url: `/device/${id}`, method: 'DELETE' });
}
