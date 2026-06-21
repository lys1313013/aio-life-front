import { request, post } from '../utils/request';

export function query(data: any = {}) {
  return post('/device/query', data);
}

export function insertOrUpdate(data: any) {
  return post('/device/insertOrUpdate', data);
}

export function deleteData(id: number | string) {
  return request({ url: `/device/${id}`, method: 'DELETE' });
}
