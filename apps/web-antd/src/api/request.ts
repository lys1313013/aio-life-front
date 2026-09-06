/**
 * 该文件可自行根据业务逻辑进行调整
 */
import type { RequestClientOptions } from '@vben/request';

import { useAppConfig } from '@vben/hooks';
import { preferences } from '@vben/preferences';
import {
  authenticateResponseInterceptor,
  defaultResponseInterceptor,
  errorMessageResponseInterceptor,
  isCancel,
  RequestClient,
} from '@vben/request';
import { useAccessStore } from '@vben/stores';

import { message } from 'ant-design-vue';

import { useAuthStore } from '#/store';
import { useSecondaryLockStore } from '#/store/secondary-lock';

import { refreshTokenApi } from './core/auth';

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

function createRequestClient(baseURL: string, options?: RequestClientOptions) {
  const client = new RequestClient({
    ...options,
    baseURL,
  });

  /**
   * 重新认证逻辑
   */
  async function doReAuthenticate() {
    console.warn('Access token or refresh token is invalid or expired. ');
    const accessStore = useAccessStore();
    const authStore = useAuthStore();
    accessStore.setAccessToken(null);
    if (
      preferences.app.loginExpiredMode === 'modal' &&
      accessStore.isAccessChecked
    ) {
      accessStore.setLoginExpired(true);
    } else {
      await authStore.logout();
    }
  }

  /**
   * 刷新token逻辑
   */
  async function doRefreshToken() {
    const accessStore = useAccessStore();
    const resp = await refreshTokenApi();
    const newToken = resp.data;
    accessStore.setAccessToken(newToken);
    return newToken;
  }

  function formatToken(token: null | string) {
    return token ? `Bearer ${token}` : null;
  }

  // 请求头处理
  client.addRequestInterceptor({
    fulfilled: async (config) => {
      const accessStore = useAccessStore();

      config.headers.Authorization = formatToken(accessStore.accessToken);
      config.headers['Accept-Language'] = preferences.app.locale;
      return config;
    },
  });

  // GET 请求自动重试：网络错误 / 超时 / 5xx 时最多重试 2 次（共 3 次），指数退避。
  // 必须注册在响应拦截器链最前面（axios 响应拦截器按注册顺序执行），
  // 保证重试完成后才轮到错误提示等后续拦截器；业务错误（rscode != '0'）由
  // defaultResponseInterceptor 在更后面的环节抛出，不会进入重试。
  client.addResponseInterceptor({
    fulfilled: (response) => response,
    rejected: async (error) => {
      const config = error?.config;
      const status = error?.response?.status;
      // 无响应（断网 / 超时）或服务端 5xx 才可重试；4xx、业务错误、取消请求不重试
      const retryable = !error?.response || status >= 500;
      const isGet = config?.method?.toUpperCase() === 'GET';
      if (
        !isGet ||
        !retryable ||
        isCancel(error) ||
        (config.__getRetryCount ?? 0) >= 2
      ) {
        throw error;
      }
      config.__getRetryCount = (config.__getRetryCount ?? 0) + 1;
      await new Promise((resolve) =>
        setTimeout(resolve, 300 * 2 ** (config.__getRetryCount - 1)),
      );
      return client.instance(config);
    },
  });

  // 处理返回的响应数据格式
  client.addResponseInterceptor(
    defaultResponseInterceptor({
      codeField: 'rscode',
      dataField: 'data',
      successCode: '0',
    }),
  );

  // token过期的处理
  client.addResponseInterceptor(
    authenticateResponseInterceptor({
      client,
      doReAuthenticate,
      doRefreshToken,
      enableRefreshToken: preferences.app.enableRefreshToken,
      formatToken,
    }),
  );

  // 二级锁错误处理
  client.addResponseInterceptor({
    fulfilled: (response) => response,
    rejected: (error) => {
      const responseData = error?.response?.data ?? {};
      if (responseData?.rscode === '2001') {
        const requestUrl = error?.config?.url ?? '';
        const menuPath = requestUrl.startsWith('/')
          ? requestUrl
          : `/${requestUrl}`;
        const secondaryLockStore = useSecondaryLockStore();
        secondaryLockStore.triggerUnlock(menuPath);
        return Promise.reject(error);
      }
      return Promise.reject(error);
    },
  });

  // 通用的错误处理,如果没有进入上面的错误处理逻辑，就会进入这里
  client.addResponseInterceptor(
    errorMessageResponseInterceptor((msg: string, error) => {
      // 忽略特定接口的报错
      if (
        error?.config?.url?.includes('/dashboard/card') ||
        error?.config?.url?.includes('/message/unread-count')
      ) {
        return;
      }
      // 二级锁错误不弹 error message，由二级锁弹窗处理
      const responseData = error?.response?.data ?? {};
      if (responseData?.rscode === '2001') {
        return;
      }
      // 这里可以根据业务进行定制,你可以拿到 error 内的信息进行定制化处理，根据不同的 code 做不同的提示，而不是直接使用 message.error 提示 msg
      // 当前mock接口返回的错误字段是 error 或者 message
      const errorMessage = responseData?.result ?? '';
      // 如果没有错误信息，则会根据状态码进行提示
      // 首屏通常会并发请求多个接口。服务异常时共用同一个 key，后续错误会
      // 更新当前提示而不是继续堆叠，同时不影响业务层的成功/警告提示。
      message.error({
        content: errorMessage || msg,
        key: 'global-request-error',
      });
    }),
  );

  return client;
}

export const requestClient = createRequestClient(apiURL, {
  responseReturn: 'data',
});

export const baseRequestClient = new RequestClient({ baseURL: apiURL });
