import { getQuery } from '@/utils/query';
import { post } from '../utils/request';

export function query(data: any = {}) {
  return getQuery('/income/query', data);
}

export function insertOrUpdate(data: any) {
  return post('/income/insertOrUpdate', data);
}

export function deleteData(data: any) {
  return post('/income/delete', data);
}

export function statisticsByYear(data: any) {
  return getQuery('/income/statisticsByYear', data);
}

export function statisticsByMonth(data: any) {
  return getQuery('/income/statisticsByMonth', data);
}
