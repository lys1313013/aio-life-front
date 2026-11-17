import type { ApiRequests } from '#/api/payload';

import { pickPayload } from '#/api/payload';
import { requestClient } from '#/api/request';

export interface UserBindEntity {
  id?: string;
  userId?: string;
  platform: string;
  platformUsername?: string;
  accessToken?: string;
  metaJson?: any;
  createTime?: string;
  updateTime?: string;
}

export interface DoubanAccountVerifyResult {
  accountId: string;
  homepageUrl: string;
  nickname: string;
}

export const getUserBindListApi = (includeToken?: boolean) => {
  return requestClient.get<UserBindEntity[]>('/userbinds/list', {
    params: { includeToken },
  });
};

export const addUserBindApi = (data: ApiRequests['UserThirdPartyAccountCreateReq']) => {
  return requestClient.post<boolean>(
    '/userbinds',
    pickPayload('UserThirdPartyAccountCreateReq', data),
  );
};

export const updateUserBindApi = (data: ApiRequests['UserThirdPartyAccountUpdateReq']) => {
  return requestClient.put<boolean>(
    '/userbinds',
    pickPayload('UserThirdPartyAccountUpdateReq', data),
  );
};

export const deleteUserBindApi = (id: string) => {
  return requestClient.delete<boolean>(`/userbinds/${id}`);
};

export const verifyDoubanAccountApi = (accountId: string) => {
  return requestClient.get<DoubanAccountVerifyResult>(
    '/userbinds/douban/verify',
    {
      params: { accountId },
    },
  );
};
