import { get, post } from '@/utils/request';

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
  return await get('/userDictType/getByDictType', { dictType });
}

export async function query(data: any) {
  return await post('/userDictType/query', data);
}

export async function insertOrUpdate(data: any) {
  return await post('/userDictType/insertOrUpdate', data);
}

export async function deleteData(data: any) {
  return await post('/userDictType/delete', data);
}
