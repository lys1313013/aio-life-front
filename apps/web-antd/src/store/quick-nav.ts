import type { QuickNavItem, QuickNavSaveItem } from '#/api/core/quick-nav';

import { ref } from 'vue';

import { defineStore } from 'pinia';

import { getMyQuickNavApi, saveMyQuickNavApi } from '#/api/core/quick-nav';

export const useQuickNavStore = defineStore('quick-nav', () => {
  const items = ref<QuickNavItem[]>([]);
  const loaded = ref(false);
  const loading = ref(false);
  const error = ref<null | string>(null);

  const saving = ref(false);
  let generation = 0;
  let pending: null | Promise<void> = null;

  function load() {
    if (pending) return pending;
    if (saving.value) return Promise.resolve();
    const version = ++generation;
    loading.value = true;
    error.value = null;
    const operation = (async () => {
      try {
        const data = await getMyQuickNavApi();
        if (version !== generation) return;
        items.value = data;
        loaded.value = true;
      } catch (error_) {
        if (version !== generation) return;
        error.value = (error_ as Error).message ?? '加载失败';
        loaded.value = true;
      } finally {
        if (version === generation) {
          loading.value = false;
          pending = null;
        }
      }
    })();
    pending = operation;
    return operation;
  }

  async function save(draft: QuickNavSaveItem[]) {
    const version = ++generation;
    pending = null;
    loading.value = false;
    saving.value = true;
    try {
      const data = await saveMyQuickNavApi(draft);
      if (version !== generation) return;
      items.value = data;
      loaded.value = true;
      error.value = null;
    } finally {
      if (version === generation) saving.value = false;
    }
  }

  function clear() {
    return save([]);
  }

  function $reset() {
    generation++;
    pending = null;
    items.value = [];
    loaded.value = false;
    loading.value = false;
    saving.value = false;
    error.value = null;
  }

  return { $reset, clear, error, items, load, loaded, loading, save };
});
