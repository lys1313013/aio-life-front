import { describe, expect, it } from 'vitest';

import { avatarFileList, avatarProfilePayload } from './avatar-settings';

const id = '0123456789abcdef0123456789abcdef';
const base = { nickname: '测试用户', introduction: '简介' };

describe('头像文件绑定', () => {
  it('回显后再次保存只提交文件 ID，不提交 URL', () => {
    const avatarFiles = avatarFileList({
      avatarFileId: id,
      avatarUrl: 'https://example.test/api/file/preview/' + id,
    });
    expect(avatarProfilePayload({ ...base, avatarFiles })).toEqual({
      ...base,
      avatarFileId: id,
    });
  });
  it('缺省保持，移除上传项显式清除', () => {
    expect(avatarProfilePayload(base)).toEqual(base);
    expect(avatarProfilePayload({ ...base, avatarFiles: [] })).toEqual({
      ...base,
      avatarFileId: null,
    });
    expect(avatarFileList({ avatarFileId: null, avatarUrl: null })).toEqual([]);
  });
  it.each(['uploading', 'error', 'removed'])(
    '上传状态 %s 不能保存',
    (status) => {
      expect(() =>
        avatarProfilePayload({
          ...base,
          avatarFiles: [{ status, response: { id, fileUrl: '/image' } }],
        }),
      ).toThrow('上传成功');
    },
  );
  it('上传成功也不能把 URL 或数字当作文件 ID', () => {
    for (const invalid of ['/image.png', 123, undefined]) {
      expect(() =>
        avatarProfilePayload({
          ...base,
          avatarFiles: [
            {
              status: 'done',
              response: { id: invalid as string, fileUrl: '/image' },
            },
          ],
        }),
      ).toThrow('上传结果异常');
    }
  });
});
