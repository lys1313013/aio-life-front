import type { ApiRequests } from '#/api/payload';

import { pickPayload } from '#/api/payload';
import { getQuery } from '#/api/query';
import { requestClient } from '#/api/request';

export async function query(data: any) {
  return await getQuery('/thought/query', data);
}

export async function save(data: ApiRequests['ThoughtSaveReq']) {
  return await requestClient.post(
    '/thought',
    pickPayload('ThoughtSaveReq', data),
  );
}

export async function update(
  data: ApiRequests['ThoughtUpdateReq'] & { id?: string },
) {
  return await requestClient.put(
    `/thought/${data.id}`,
    pickPayload('ThoughtUpdateReq', data),
  );
}

export async function getPinnedThoughts() {
  return await requestClient.get('/thought/dashboard');
}

export async function deleteData(data: ApiRequests['CommonReq']) {
  return await requestClient.post(
    '/thought/batchDelete',
    pickPayload('CommonReq', data),
  );
}
