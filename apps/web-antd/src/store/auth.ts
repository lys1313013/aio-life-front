import type { Recordable, UserInfo } from '@vben/types';

import type { WechatWebCredentials } from '#/api/core/wechat-web';

import { ref } from 'vue';

import { LOGIN_PATH } from '@vben/constants';
import { preferences } from '@vben/preferences';
import { resetAllStores, useAccessStore, useUserStore } from '@vben/stores';

import { notification } from 'ant-design-vue';
import { defineStore } from 'pinia';

import { getAccessCodesApi, loginApi, logoutApi } from '#/api/core/auth';
import { getUserInfoApi } from '#/api/core/user';
import { exchangeWechatWebLogin } from '#/api/core/wechat-web';
import { $t } from '#/locales';
import { router } from '#/router';
import { clearImageCache } from '#/utils/file';

export const useAuthStore = defineStore('auth', () => {
  const accessStore = useAccessStore();
  const userStore = useUserStore();

  const loginLoading = ref(false);

  /**
   * 异步处理登录操作
   * Asynchronously handle the login process
   * @param params 登录表单数据
   */
  async function authLogin(
    params: Recordable<any>,
    onSuccess?: () => Promise<void> | void,
  ) {
    return finishLogin(() => loginApi(params), onSuccess);
  }

  async function authWechatLogin(credentials: WechatWebCredentials) {
    return finishLogin(() => exchangeWechatWebLogin(credentials));
  }

  async function finishLogin(
    authenticate: () => Promise<{ accessToken: string }>,
    onSuccess?: () => Promise<void> | void,
  ) {
    // 异步处理用户登录操作并获取 accessToken
    let userInfo: null | UserInfo = null;
    try {
      loginLoading.value = true;
      const { accessToken } = await authenticate();

      userInfo = await completeLogin(accessToken, onSuccess);
    } finally {
      loginLoading.value = false;
    }

    return {
      userInfo,
    };
  }

  /** 密码登录和扫码登录共用的用户、权限与跳转初始化。 */
  async function completeLogin(
    accessToken: string,
    onSuccess?: () => Promise<void> | void,
  ) {
    let userInfo: null | UserInfo = null;
    // 如果成功获取到 accessToken
    if (accessToken) {
      accessStore.setAccessToken(accessToken);

      // 获取用户信息并存储到 accessStore 中
      const [fetchUserInfoResult, accessCodes] = await Promise.all([
        fetchUserInfo(),
        getAccessCodesApi(),
      ]);

      userInfo = fetchUserInfoResult;

      userStore.setUserInfo(userInfo);
      accessStore.setAccessCodes(accessCodes);

      if (accessStore.loginExpired) {
        accessStore.setLoginExpired(false);
      } else {
        onSuccess
          ? await onSuccess?.()
          : await router.push(
              userInfo.homePath || preferences.app.defaultHomePath,
            );
      }

      if (userInfo?.realName) {
        notification.success({
          description: `${$t('authentication.loginSuccessDesc')}:${userInfo?.realName}`,
          duration: 3,
          message: $t('authentication.loginSuccess'),
        });
      }
    }
    return userInfo;
  }

  async function logout(redirect: boolean = true) {
    try {
      await logoutApi();
    } catch {
      // 不做任何处理
    }
    clearImageCache();
    try {
      resetAllStores();
    } catch (error_) {
      // 某个 setup-style store 未实现 $reset 时会抛错，吞掉以确保后续跳转执行
      console.error('resetAllStores failed during logout', error_);
    }
    accessStore.setLoginExpired(false);

    // 回登录页带上当前路由地址
    await router.replace({
      path: LOGIN_PATH,
      query: redirect
        ? {
            redirect: encodeURIComponent(router.currentRoute.value.fullPath),
          }
        : {},
    });
  }

  async function fetchUserInfo() {
    let userInfo: null | UserInfo = null;
    userInfo = await getUserInfoApi();
    userStore.setUserInfo(userInfo);
    return userInfo;
  }

  function $reset() {
    loginLoading.value = false;
  }

  return {
    $reset,
    authLogin,
    completeLogin,
    authWechatLogin,
    fetchUserInfo,
    loginLoading,
    logout,
  };
});
