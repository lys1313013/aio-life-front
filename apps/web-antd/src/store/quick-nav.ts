import { ref } from 'vue';

import { defineStore } from 'pinia';

import {
  getMyQuickNavApi,
  saveMyQuickNavApi,
  type QuickNavItem,
  type QuickNavSaveItem,
} from '#/api/core/quick-nav';

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
    } catch (e) {
      error.value = (e as Error).message ?? '加载失败';
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

  return { clear, error, items, load, loaded, loading, save };
});
