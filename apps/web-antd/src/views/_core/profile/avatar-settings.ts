import type { UpdateUserParams } from '#/api/core/user';

type UploadedAvatar = { id: string; fileUrl: string };
type AvatarItem = { status?: string; response?: UploadedAvatar };

export function avatarFileList(data: {
  avatarFileId?: string | null;
  avatarUrl?: string | null;
}) {
  return data.avatarFileId
    ? [
        {
          name: 'avatar.png',
          status: 'done',
          uid: data.avatarFileId,
          url: data.avatarUrl || '',
          response: { id: data.avatarFileId, fileUrl: data.avatarUrl || '' },
        },
      ]
    : [];
}

/** 上传项只用于展示，提交只取服务端返回的文件 ID；空列表显式清除。 */
export function avatarProfilePayload(values: {
  nickname: string;
  introduction: string;
  avatarFiles?: AvatarItem[];
}): UpdateUserParams {
  const result: UpdateUserParams = {
    nickname: values.nickname,
    introduction: values.introduction,
  };
  if (values.avatarFiles === undefined) return result;
  if (!Array.isArray(values.avatarFiles) || values.avatarFiles.length > 1)
    throw new Error('头像数据异常，请重新上传');
  const item = values.avatarFiles[0];
  if (!item) return { ...result, avatarFileId: null };
  if (item.status !== 'done') throw new Error('请等待头像上传成功后再保存');
  const id = item.response?.id;
  if (typeof id !== 'string' || !/^[a-fA-F0-9]{32}$/.test(id))
    throw new Error('头像上传结果异常，请重新上传');
  return { ...result, avatarFileId: id };
}
