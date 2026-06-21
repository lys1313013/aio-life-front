import { defineStore } from "pinia";
import { ref } from "vue";

export const useUserStore = defineStore("user", () => {
  const token = ref<string | null>(uni.getStorageSync("token") || null);
  const userInfo = ref<any>(null);

  const setToken = (newToken: string) => {
    token.value = newToken;
    uni.setStorageSync("token", newToken);
  };

  const clearToken = () => {
    token.value = null;
    uni.removeStorageSync("token");
  };

  const setUserInfo = (info: any) => {
    userInfo.value = info;
  };

  return {
    token,
    userInfo,
    setToken,
    clearToken,
    setUserInfo,
  };
});
