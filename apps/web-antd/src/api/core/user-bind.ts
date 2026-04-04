import { requestClient } from '#/api/request';

export interface UserBindEntity {
  id?: number;
  userId?: number;
  platform: string;
  platformUsername?: string;
  accessToken?: string;
  metaJson?: any;
  createTime?: string;
  updateTime?: string;
}

export const getUserBindListApi = (includeToken?: boolean) => {
  return requestClient.get<UserBindEntity[]>('/userbinds/list', {
    params: { includeToken },
  });
};

export const addUserBindApi = (data: UserBindEntity) => {
  return requestClient.post<boolean>('/userbinds', data);
};

export const updateUserBindApi = (data: UserBindEntity) => {
  return requestClient.put<boolean>('/userbinds', data);
};

export const deleteUserBindApi = (id: number) => {
  return requestClient.delete<boolean>(`/userbinds/${id}`);
};
