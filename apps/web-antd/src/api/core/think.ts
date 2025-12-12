import { requestClient } from '#/api/request';

export async function query(data: any) {
  return await requestClient.post('/thought/query', data);
}

export async function save(data: any) {
  return await requestClient.post('/thought/save', data);
}

export async function update(data: any) {
  return await requestClient.post('/thought/update', data);
}

export async function deleteData(data: any) {
  return await requestClient.post('/thought/batchDelete', data);
}
