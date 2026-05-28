import { requestClient } from '#/api/request';

/**
 * 获取合并后的字典数据（下拉框展示用）
 * @param dictType 字典类型
 */
export async function getUserDictData(dictType: string) {
  return await requestClient.get('/userDict/getByDictType', {
    params: { dictType },
  });
}

/**
 * 获取用于配置界面的合并字典列表
 * @param dictType 字典类型
 */
export async function getUserDictConfigList(dictType: string) {
  return await requestClient.get('/userDict/listConfig', {
    params: { dictType },
  });
}

/**
 * 保存用户字典配置（新增/修改）
 * @param data 配置数据
 */
export async function saveUserDictConfig(data: any) {
  return await requestClient.post('/userDict/saveConfig', data);
}

/**
 * 删除用户字典配置
 * @param userDictId 用户字典ID
 */
export async function deleteUserDictConfig(userDictId: string | number) {
  return await requestClient.post('/userDict/deleteConfig', null, {
    params: { userDictId },
  });
}
