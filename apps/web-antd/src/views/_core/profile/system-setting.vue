<script setup lang="ts">
import { Button as AButton, message, Modal } from 'ant-design-vue';

const handleClearCache = () => {
  Modal.confirm({
    title: '清除缓存',
    content: '确定要清除所有前端缓存并更新版本吗？这将导致页面重新加载。',
    onOk: () => {
      // 备份账号相关的存储信息，避免重新登录
      const localBackup: Record<string, string> = {};
      const sessionBackup: Record<string, string> = {};

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.includes('core-access') || key.includes('password-vault'))
        ) {
          localBackup[key] = localStorage.getItem(key) || '';
        }
      }

      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (
          key &&
          (key.includes('core-access') || key.includes('password-vault'))
        ) {
          sessionBackup[key] = sessionStorage.getItem(key) || '';
        }
      }

      // Clear localStorage and sessionStorage
      localStorage.clear();
      sessionStorage.clear();

      // 还原账号信息
      Object.keys(localBackup).forEach((key) => {
        localStorage.setItem(key, localBackup[key] as string);
      });
      Object.keys(sessionBackup).forEach((key) => {
        sessionStorage.setItem(key, sessionBackup[key] as string);
      });

      message.success('缓存已清除，即将刷新页面');

      // Reload the page to fetch the latest version
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    },
  });
};
</script>

<template>
  <div class="p-4">
    <div class="mb-4 text-lg font-medium">系统设置</div>
    <div class="flex items-center justify-between border-b pb-4">
      <div>
        <div class="text-base">清除缓存</div>
        <div class="text-sm text-muted-foreground">
          清除所有前端缓存数据并强制刷新页面以获取最新版本
        </div>
      </div>
      <AButton type="primary" danger @click="handleClearCache">
        清除并更新
      </AButton>
    </div>
  </div>
</template>
