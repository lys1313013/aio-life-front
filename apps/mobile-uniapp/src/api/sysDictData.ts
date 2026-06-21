import { post } from '@/utils/request';

export async function query(data: any) {
  return await post('/sysDictData/query', data);
}

export async function insertOrUpdate(data: any) {
  return await post('/sysDictData/insertOrUpdate', data);
}

export async function deleteData(data: any) {
  return await post('/sysDictData/delete', data);
}
