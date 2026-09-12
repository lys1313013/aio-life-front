import type { AxiosAdapter } from 'axios';

import { CanceledError, isCancel } from 'axios';

/** 在传输层重试，确保业务响应解包和错误提示仅执行一次。 */
export function withGetRetry(adapter: AxiosAdapter): AxiosAdapter {
  return async (config) => {
    for (let attempt = 0; ; attempt++) {
      if (config.signal?.aborted) {
        throw new CanceledError();
      }
      config.cancelToken?.throwIfRequested();
      try {
        return await adapter(config);
      } catch (error: any) {
        if (
          config.method?.toUpperCase() !== 'GET' ||
          isCancel(error) ||
          attempt >= 2 ||
          (error?.response && error.response.status < 500)
        ) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** attempt));
      }
    }
  };
}
