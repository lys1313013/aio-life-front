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
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: string;
  fileType: string;
  hashValue: string;
  bizType: string;
  bizId?: string;
  isPublic: number;
  createTime: string;
}

export const FILE_BIZ_TYPE = {
  AVATAR: 'avatar',
  DEVICE: 'device',
  FEEDBACK: 'feedback',
  FEEDBACK_COMMENT: 'feedback_comment',
  HONOR_RECORD: 'honor_record',
  MOVIE: 'movie',
  READ_RECORD: 'read',
  WARDROBE_ITEM: 'wardrobe_item',
} as const;

export type FileBizType = (typeof FILE_BIZ_TYPE)[keyof typeof FILE_BIZ_TYPE];

/**
 * 统一文件上传入口。
 */
export async function uploadFile(file: File, bizType: FileBizType) {
  return requestClient.upload<FileVO>('/file/upload', { file, bizType });
}
