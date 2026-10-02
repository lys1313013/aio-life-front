import type { ApiRequests } from '#/api/payload';

import { pickPayload } from '#/api/payload';
import { getQuery } from '#/api/query';
import { requestClient } from '#/api/request';

/**
 * 查询
 */
export async function query(data: any) {
  return await getQuery('/sysDictData/query', data);
}

/**
 * 新增
 */
export async function add(data: ApiRequests['SysDictDataCreateReq']) {
  return await requestClient.post(
    '/sysDictData',
    pickPayload('SysDictDataCreateReq', data),
  );
}

/**
 * 更新
 */
export async function update(
  dictCode: number | string,
  data: ApiRequests['SysDictDataUpdateReq'],
) {
  return await requestClient.put(
    `/sysDictData/${dictCode}`,
    pickPayload('SysDictDataUpdateReq', data),
  );
}

/**
 * 删除
 */
export async function deleteData(data: any) {
  return await requestClient.delete(`/sysDictData/${data.dictCode}`);
}
