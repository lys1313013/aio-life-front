import type { BasicUserInfo } from '@vben-core/typings';

/** 用户信息 */
interface UserInfo extends BasicUserInfo {
  avatarFileId?: string | null;
  avatarUrl?: string | null;
  /** 是否已设置登录密码 */
  hasPassword: boolean;
  /** 是否已绑定微信身份 */
  wechatBound: boolean;
  /**
   * 用户描述
   */
  desc: string;
  /**
   * 首页地址
   */
  homePath: string;

  /**
   * accessToken
   */
  token: string;
}

export type { UserInfo };
