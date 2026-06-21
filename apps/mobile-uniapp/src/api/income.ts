import { post } from '../utils/request';

export function query(data: any = {}) {
  return post('/income/query', data);
}

export function insertOrUpdate(data: any) {
  return post('/income/insertOrUpdate', data);
}

export function deleteData(data: any) {
  return post('/income/delete', data);
}

export function statisticsByYear(data: any) {
  return post('/income/statisticsByYear', data);
}

export function statisticsByMonth(data: any) {
  return post('/income/statisticsByMonth', data);
}
