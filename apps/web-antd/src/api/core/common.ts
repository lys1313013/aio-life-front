import { requestClient } from '#/api/request';

/**
 * 根据数据字典类型获取枚举值列表
 *
 * @param dictType 数据字典类型
 * @returns 枚举值列表
 */
// 假设已经定义了 SysDictTypeEntity 和 SysDictDataEntity 类型
interface SysDictTypeEntity {
  dictName: string;
}

interface SysDictDataEntity {
  id: number;
  label: string;
  value: string;
}

interface ResponseData {
  sysDictTypeEntity: SysDictTypeEntity;
  dictDetailList: SysDictDataEntity[];
}

export async function getByDictType(dictType: string): Promise<ResponseData> {
  return await requestClient.get('/sysDictType/getByDictType', {
    params: { dictType },
  });
}

/**
 * 文件VO
 */
export interface FileVO {
  id: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  hashValue: string;
  bizType: string;
  bizId: number;
  isPublic: number;
  createTime: string;
}
