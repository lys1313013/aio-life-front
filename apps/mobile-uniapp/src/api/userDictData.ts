import { post } from '@/utils/request';

export async function query(data: any) {
  return await post('/userDictData/query', data);
}

export async function insertOrUpdate(data: any) {
  return await post('/userDictData/insertOrUpdate', data);
}

export async function deleteData(data: any) {
  return await post('/userDictData/delete', data);
}
