import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createMembershipProvider,
  deleteMembershipProvider,
  membershipProviderIconUrl,
  updateMembershipProvider,
} from './providers';

const request = vi.hoisted(() => ({
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));
vi.mock('#/api/request', () => ({ requestClient: request }));
vi.mock('@vben/hooks', () => ({
  useAppConfig: () => ({ apiURL: 'https://api.example.test/api/' }),
}));
beforeEach(() => vi.clearAllMocks());

describe('会员平台接口边界', () => {
  const data = {
    name: ' 腾讯视频 ',
    code: ' tencent_video ',
    category: 'video',
    iconKey: undefined,
    sortOrder: 0,
    isEnabled: 1,
    id: '900719925474099400',
    providerName: '不发送响应属性',
  };
  const payload = {
    name: '腾讯视频',
    code: 'tencent_video',
    category: 'video',
    iconKey: null,
    sortOrder: 0,
    isEnabled: 1,
  };
  it('创建仅发送允许的字段，清空图标使用 null', async () => {
    await createMembershipProvider(data);
    expect(request.post).toHaveBeenCalledWith(
      '/system/membership-providers',
      payload,
    );
  });
  it('更新和删除保留大整数 ID 字符串', async () => {
    await updateMembershipProvider(data.id, data);
    await deleteMembershipProvider(data.id);
    expect(request.put).toHaveBeenCalledWith(
      `/system/membership-providers/${data.id}`,
      payload,
    );
    expect(request.delete).toHaveBeenCalledWith(
      `/system/membership-providers/${data.id}`,
    );
  });
  it('图标 URL 服从部署 API 地址并编码 key', () => {
    expect(membershipProviderIconUrl('logo/name')).toBe(
      'https://api.example.test/api/membership/provider-icons/logo%2Fname',
    );
  });
});
