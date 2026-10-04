import { useAppConfig } from '@vben/hooks';

import { pickPayload } from '#/api/payload';
import { requestClient } from '#/api/request';

export interface MembershipProviderRequest {
  name: string;
  code: string;
  category: string;
  iconKey?: null | string;
  sortOrder: number;
  isEnabled: number;
}

export interface MembershipProviderVO extends MembershipProviderRequest {
  id: string;
}

export interface MembershipProviderIcon {
  key: string;
  name: string;
  url: string;
}

export async function queryMembershipProviders() {
  return await requestClient.get<MembershipProviderVO[]>(
    '/membership/providers',
  );
}

export async function queryMembershipProviderIcons() {
  return await requestClient.get<MembershipProviderIcon[]>(
    '/membership/provider-icons',
  );
}

export async function queryManagedMembershipProviders() {
  return await requestClient.get<MembershipProviderVO[]>(
    '/system/membership-providers',
  );
}

function providerPayload(
  data: MembershipProviderRequest,
): MembershipProviderRequest {
  return pickPayload('MembershipProviderReq', {
    name: data.name.trim(),
    code: data.code.trim(),
    category: data.category,
    iconKey: data.iconKey || null,
    sortOrder: data.sortOrder,
    isEnabled: data.isEnabled,
  }) as MembershipProviderRequest;
}

export async function createMembershipProvider(
  data: MembershipProviderRequest,
) {
  return await requestClient.post<MembershipProviderVO>(
    '/system/membership-providers',
    providerPayload(data),
  );
}

export async function updateMembershipProvider(
  id: string,
  data: MembershipProviderRequest,
) {
  return await requestClient.put<MembershipProviderVO>(
    `/system/membership-providers/${id}`,
    providerPayload(data),
  );
}

export async function deleteMembershipProvider(id: string) {
  return await requestClient.delete<void>(`/system/membership-providers/${id}`);
}

export function membershipProviderIconUrl(key: string) {
  const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);
  return `${apiURL.replace(/\/$/, '')}/membership/provider-icons/${encodeURIComponent(key)}`;
}
