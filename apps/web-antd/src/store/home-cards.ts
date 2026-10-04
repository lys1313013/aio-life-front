import type { HomeCardPreference } from '#/api/core/home-cards';

import { computed, ref, watch } from 'vue';

import { useUserStore } from '@vben/stores';

import { defineStore } from 'pinia';

import {
  getHomeCards,
  orderHomeCards,
  resetHomeCards,
  toggleHomeCard,
} from '#/api/core/home-cards';

export const useHomeCardsStore = defineStore('home-cards', () => {
  const user = useUserStore();
  const items = ref<HomeCardPreference[]>([]);
  const ready = ref(false);
  const loading = ref(false);
  const error = ref('');
  const busy = ref('');
  let revision = 0;
  let pending: null | Promise<void> = null;
  const identity = computed(() =>
    String(user.userInfo?.userId || user.userInfo?.id || ''),
  );
  function $reset() {
    revision++;
    items.value = [];
    ready.value = false;
    loading.value = false;
    error.value = '';
    busy.value = '';
    pending = null;
  }
  watch(identity, $reset, { flush: 'sync' });
  async function load() {
    if (pending) return pending;
    if (busy.value) return;
    const version = ++revision;
    loading.value = true;
    error.value = '';
    const task = (async () => {
      try {
        const data = await getHomeCards();
        if (version !== revision) return;
        items.value = data;
        ready.value = true;
      } catch (error_) {
        if (version === revision)
          error.value = (error_ as Error).message || '加载失败';
      } finally {
        if (version === revision) {
          loading.value = false;
          pending = null;
        }
      }
    })();
    pending = task;
    return task;
  }
  async function mutate(
    key: string,
    operation: () => Promise<HomeCardPreference[]>,
  ) {
    if (!ready.value || busy.value || loading.value) return false;
    const version = ++revision;
    busy.value = key;
    try {
      const data = await operation();
      if (version !== revision) return false;
      items.value = data;
      return true;
    } finally {
      if (version === revision) busy.value = '';
    }
  }
  const sections = computed(() =>
    items.value.filter((item) => item.group === 'section' && item.enabled),
  );
  function enabled(key: string) {
    return (
      ready.value &&
      items.value.some((item) => item.cardKey === key && item.enabled)
    );
  }
  function order(key: string) {
    return (
      items.value.find((item) => item.cardKey === key)?.sortOrder ??
      Number.MAX_SAFE_INTEGER
    );
  }
  return {
    $reset,
    items,
    ready,
    loading,
    error,
    busy,
    sections,
    enabled,
    order,
    load,
    toggle: (key: string, value: boolean) =>
      mutate(key, () => toggleHomeCard(key, value)),
    reorder: (group: string, keys: string[]) =>
      mutate(group, () => orderHomeCards(group, keys)),
    reset: () => mutate('reset', resetHomeCards),
  };
});
