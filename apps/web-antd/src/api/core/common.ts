import { requestClient } from '#/api/request';

/**
 * 根据数据字典类型获取枚举值列表
 *
 * @param dictType 数据字典类型
 * @returns 枚举值列表
 */
export async function getByDictType(dictType: number) {
  return await requestClient.get('/sysDictType/getByDictType', {
    params: { dictType },
  });
}
