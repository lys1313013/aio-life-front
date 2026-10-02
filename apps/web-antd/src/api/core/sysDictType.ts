import type { ApiRequests } from '#/api/payload';

import { pickPayload } from '#/api/payload';
import { getQuery } from '#/api/query';
import { requestClient } from '#/api/request';

/**
 * 查询
 */
export async function query(data: any) {
  return await getQuery('/sysDictType/query', data);
}

/**
 * 新增
 */
export async function add(data: ApiRequests['SysDictTypeCreateReq']) {
  return await requestClient.post(
    '/sysDictType',
    pickPayload('SysDictTypeCreateReq', data),
  );
}

/**
 * 更新
 */
export async function update(
  dictId: number | string,
  data: ApiRequests['SysDictTypeUpdateReq'],
) {
  return await requestClient.put(
    `/sysDictType/${dictId}`,
    pickPayload('SysDictTypeUpdateReq', data),
  );
}

/**
 * 删除
 */
export async function deleteData(data: any) {
  return await requestClient.delete(`/sysDictType/${data.dictId}`);
}
