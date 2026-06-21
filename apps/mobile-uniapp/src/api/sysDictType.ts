import { post } from '@/utils/request';

export async function query(data: any) {
  return await post('/sysDictType/query', data);
}

export async function insertOrUpdate(data: any) {
  return await post('/sysDictType/insertOrUpdate', data);
}

export async function deleteData(data: any) {
  return await post('/sysDictType/delete', data);
}
