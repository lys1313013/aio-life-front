// src/utils/request.ts
import { useUserStore } from "../store/user";

const BASE_URL = import.meta.env.VITE_GLOB_API_URL || "http://localhost:5666/api";

// Toast 去重：同一消息在 DEDUP_INTERVAL 内不重复弹出，避免多请求同时失败时弹一堆
const DEDUP_INTERVAL = 3000;
const recentToasts = new Map<string, number>();

function showToast(
  title: string,
  icon: "none" | "success" | "loading" = "none",
) {
  const now = Date.now();
  const lastTime = recentToasts.get(title);
  if (lastTime && now - lastTime < DEDUP_INTERVAL) {
    return;
  }
  recentToasts.set(title, now);
  // 顺带清理过期记录，避免 Map 无限增长
  if (recentToasts.size > 20) {
    for (const [k, t] of recentToasts) {
      if (now - t > DEDUP_INTERVAL) recentToasts.delete(k);
    }
  }
  uni.showToast({ title, icon });
}

export interface RequestOptions extends Omit<UniApp.RequestOptions, "url"> {
  url?: string;
  custom?: {
    noAuth?: boolean;
  };
}

export const request = <T = any>(options: RequestOptions): Promise<T> => {
  return new Promise((resolve, reject) => {
    const userStore = useUserStore();
    const token = userStore.token;

    const header = {
      ...options.header,
    };

    if (token && !options.custom?.noAuth) {
      header["Authorization"] = `Bearer ${token}`;
    }

    const url = options.url || "";

    uni.request({
      ...(options as UniApp.RequestOptions),
      url: url.startsWith("http") ? url : `${BASE_URL}${url}`,
      header,
      success: (res) => {
        const { statusCode, data } = res;
        if (statusCode >= 200 && statusCode < 300) {
          const resData = data as any;
          // According to rules: Response format { rscode: '0', data: ... }, success code is '0'
          if (resData.rscode === "0") {
            resolve(resData.data as T);
          } else {
            showToast(resData.message || "请求失败");
            reject(resData);
          }
        } else if (statusCode === 401) {
          showToast("登录已过期，请重新登录");
          userStore.clearToken();
          uni.reLaunch({ url: "/pages/login/index" });
          reject(res);
        } else {
          showToast("网络错误");
          reject(res);
        }
      },
      fail: (err) => {
        showToast("网络异常");
        reject(err);
      },
    });
  });
};

export const get = <T = any>(url: string, data?: any, options?: RequestOptions) => {
  return request<T>({ url, method: "GET", data, ...options });
};

export const post = <T = any>(url: string, data?: any, options?: RequestOptions) => {
  return request<T>({ url, method: "POST", data, ...options });
};

export const put = <T = any>(url: string, data?: any, options?: RequestOptions) => {
  return request<T>({ url, method: "PUT", data, ...options });
};

export const del = <T = any>(url: string, data?: any, options?: RequestOptions) => {
  return request<T>({ url, method: "DELETE", data, ...options });
};
