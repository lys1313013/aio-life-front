import { requestClient } from '#/api/request';

/**
 * 系统配置 VO
 */
export interface SystemConfigVO {
  configKey: string;
  configValue: string;
  configType: string;
  description: string;
  updateTime: string;
}

/**
 * 获取配置列表
 */
export async function querySystemConfigs(keyPrefix?: string) {
  return await requestClient.get<SystemConfigVO[]>('/system-config/list', {
    params: { keyPrefix },
  });
}

/**
 * 获取单项配置
 */
export async function getSystemConfig(key: string) {
  return await requestClient.get<SystemConfigVO>(`/system-config/${key}`);
}

/**
 * 更新单项配置
 */
export async function updateSystemConfig(key: string, configValue: string) {
  return await requestClient.put<SystemConfigVO>(`/system-config/${key}`, { configValue });
}
