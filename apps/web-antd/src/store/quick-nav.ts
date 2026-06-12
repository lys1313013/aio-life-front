import type { QuickNavItem, QuickNavSaveItem } from '#/api/core/quick-nav';

import { ref } from 'vue';

import { defineStore } from 'pinia';

import { getMyQuickNavApi, saveMyQuickNavApi } from '#/api/core/quick-nav';

export const useQuickNavStore = defineStore('quick-nav', () => {
  const items = ref<QuickNavItem[]>([]);
  const loaded = ref(false);
  const loading = ref(false);
  const error = ref<null | string>(null);

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      items.value = await getMyQuickNavApi();
      loaded.value = true;
    } catch (error_) {
      error.value = (error_ as Error).message ?? '加载失败';
      items.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function save(draft: QuickNavSaveItem[]) {
    items.value = await saveMyQuickNavApi(draft);
  }

  async function clear() {
    items.value = await saveMyQuickNavApi([]);
  }

  function $reset() {
    items.value = [];
    loaded.value = false;
    loading.value = false;
    error.value = null;
  }

  return { $reset, clear, error, items, load, loaded, loading, save };
});
