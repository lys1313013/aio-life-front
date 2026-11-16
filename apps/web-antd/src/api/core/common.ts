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
  id: string;
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
  /** 附件对外 UUIDv4，对应 file_key，内部数字主键不进入客户端。 */
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: string;
  fileType: string;
}

export const FILE_BIZ_TYPE = {
  AVATAR: 'avatar',
  DEVICE: 'device_cover',
  FEEDBACK: 'feedback',
  FEEDBACK_COMMENT: 'feedback_comment',
  HONOR_RECORD: 'honor_record',
  MOVIE: 'movie_cover',
  EVENT_RECORD: 'event_record',
  READ_RECORD: 'read_cover',
  WARDROBE_ITEM: 'wardrobe_item_cover',
} as const;

export type FileBizType = (typeof FILE_BIZ_TYPE)[keyof typeof FILE_BIZ_TYPE];

/**
 * 统一文件上传入口。
 */
export async function uploadFile(file: File, bizType: FileBizType) {
  return requestClient.upload<FileVO>('/file/upload', { file, bizType });
}
