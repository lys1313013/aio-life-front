import { get, post, put, del } from '@/utils/request';

export async function getUserInfoApi() {
  return get('/user/info');
}

export async function getUserBasicInfoApi(id: string) {
  return get(`/user/${id}/basic`);
}

export async function updateUserInfoApi(params: any) {
  return put('/users', params);
}
