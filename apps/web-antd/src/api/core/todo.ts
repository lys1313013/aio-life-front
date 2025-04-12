import { requestClient } from '#/api/request';

export async function getTaskColumnList(data: any) {
  return await requestClient.post('/taskColumn/query', data);
}

export async function saveColumn(data: any) {
  return await requestClient.post('/taskColumn/save', data);
}

export async function updateColumn(data: any) {
    return await requestClient.post('/taskColumn/update', data);
  }

export async function deleteColumn(data: any) {
  return await requestClient.post('/taskColumn/delete', data);
}

export async function getTaskList(data: any) {
  return await requestClient.post('/task/query', data);
}

export async function saveTask(data: any) {
  return await requestClient.post('/task/save', data);
}

export async function updateTask(data: any) {
  return await requestClient.post('/task/update', data);
}

export async function deleteTask(data: any) {
  return await requestClient.post('/task/delete', data);
}
