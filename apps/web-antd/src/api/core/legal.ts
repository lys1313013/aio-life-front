import type { ApiRequests } from '#/api/payload';

import { pickPayload } from '#/api/payload';
import { requestClient } from '#/api/request';

export interface LegalPolicies {
  version: string;
  effectiveDate: string;
  operator: string;
  contactEmail: string;
  privacy: [string, string][];
  terms: [string, string][];
}
export async function getLegalPolicies() {
  return requestClient.get<LegalPolicies>('/auth/legal');
}
export async function closeAccount(data: ApiRequests['CloseAccountReq']) {
  return requestClient.post(
    '/auth/account/close',
    pickPayload('CloseAccountReq', data),
  );
}
