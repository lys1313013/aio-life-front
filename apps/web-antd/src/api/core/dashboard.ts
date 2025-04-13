import { requestClient } from '#/api/request';

export async function getDashboardCard(data: any) {
  return await requestClient.post('/dashboard/card', data);
}
