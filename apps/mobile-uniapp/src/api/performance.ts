import { getQuery } from '@/utils/query';
import { post } from "../utils/request";

export async function query(data: any) {
  return await getQuery('/performance', data);
}

export async function insertOrUpdate(data: any) {
  return await post('/performance/insertOrUpdate', data);
}

export async function deleteData(data: any) {
  return await post('/performance/delete', data);
}
