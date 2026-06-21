import { request, post } from '../utils/request';

export function query(data: any = {}) {
  return post('/expense/query', data);
}

export function insertData(data: any) {
  return post('/expense', data);
}

export function updateData(data: any) {
  return request({ url: '/expense', method: 'PUT', data });
}

export function saveBatch(dataList: any) {
  return post('/expense/saveBatch', dataList);
}

export function deleteData(data: any) {
  return post('/expense/delete', data);
}

export function deleteBatch(data: any) {
  return post('/expense/deleteBatch', data);
}

export function statisticsByYear(data: any) {
  return post('/expense/statisticsByYear', data);
}

export function statisticsByMonth(data: any) {
  return post('/expense/statisticsByMonth', data);
}
