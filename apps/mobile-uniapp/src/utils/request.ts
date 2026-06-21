// src/utils/request.ts
import { useUserStore } from "../store/user";

const BASE_URL = import.meta.env.VITE_GLOB_API_URL || "http://localhost:5666/api";

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
            uni.showToast({
              title: resData.message || "请求失败",
              icon: "none",
            });
            reject(resData);
          }
        } else if (statusCode === 401) {
          uni.showToast({ title: "登录已过期，请重新登录", icon: "none" });
          userStore.clearToken();
          uni.reLaunch({ url: "/pages/login/index" });
          reject(res);
        } else {
          uni.showToast({ title: "网络错误", icon: "none" });
          reject(res);
        }
      },
      fail: (err) => {
        uni.showToast({ title: "网络异常", icon: "none" });
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
