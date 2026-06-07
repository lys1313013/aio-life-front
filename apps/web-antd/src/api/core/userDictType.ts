import { requestClient } from '#/api/request';

/**
 * 查询
 */
export async function query(data: any) {
  return await requestClient.post('/userDictType/query', data);
}

/**
 * 新增
 */
export async function insert(data: any) {
  return await requestClient.post('/userDictType', data);
}

/**
 * 更新
 */
export async function update(data: any) {
  return await requestClient.put('/userDictType', data);
}

/**
 * 删除
 */
export async function deleteData(id: string) {
  return await requestClient.delete(`/userDictType/${id}`);
}

export interface UserDictTypeEntity {
  id: string;
  dictName: string;
  dictType: string;
}

export interface UserDictDataEntity {
  id: string;
  dictLabel: string;
  dictValue: string;
  color?: string;
  icon?: string;
  extData?: string;
  isReadonly?: string; // 是否只读，Y 是，N 否
  // 为兼容现有逻辑，添加 label 和 value
  label?: string;
  value?: string;
}

export interface UserDictResponseData {
  userDictTypeEntity: UserDictTypeEntity;
  dictDetailList: UserDictDataEntity[];
}

/**
 * 根据数据字典类型获取当前用户的枚举值列表
 *
 * @param dictType 数据字典类型
 * @returns 枚举值列表
 */
export async function getByDictType(
  dictType: string,
): Promise<UserDictResponseData> {
  return await requestClient.get('/userDictType/getByDictType', {
    params: { dictType },
  });
}

/**
 * 获取字典类型枚举
 */
export async function getDictTypeEnum() {
  return await requestClient.get('/userDictType/dictTypeEnum');
}

// ================= 管理员 API =================

export async function adminQuery(data: any) {
  return await requestClient.post('/userDictType/admin/query', data);
}

export async function adminDelete(id: string) {
  return await requestClient.delete(`/userDictType/admin/${id}`);
}
