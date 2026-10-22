import {
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  ref,
  shallowRef,
  watch,
} from 'vue';
import { useRoute } from 'vue-router';

import { useAccessStore } from '@vben/stores';

/** Load one owned record by its string ID, independent of list filters and pagination. */
export function useRecordDeepLink<T extends { id?: string }>(
  paths: readonly string[] | string,
  load: (id: string) => Promise<null | T>,
) {
  const supportedPaths = typeof paths === 'string' ? [paths] : paths;
  const route = useRoute();
  const access = useAccessStore();
  const record = shallowRef<null | T>(null);
  const loading = ref(false);
  const error = ref(false);
  const resetVersion = ref(0);
  let active = true;
  let revision = 0;
  let attemptedKey = '';

  function cancel() {
    revision++;
    resetVersion.value++;
    record.value = null;
    loading.value = false;
    error.value = false;
  }

  async function open(force = false) {
    const id = route.query.id;
    const token = access.accessToken;
    if (
      !active ||
      !supportedPaths.includes(route.path) ||
      !token ||
      typeof id !== 'string' ||
      !/^\d+$/.test(id)
    ) {
      attemptedKey = '';
      cancel();
      return;
    }
    const key = `${token}:${id}`;
    if (!force && key === attemptedKey) return;
    attemptedKey = key;
    cancel();
    const current = revision;
    loading.value = true;
    try {
      const result = await load(id);
      if (current !== revision || !active || access.accessToken !== token)
        return;
      if (!result || result.id !== id) {
        error.value = true;
        return;
      }
      record.value = result;
    } catch {
      if (current === revision) error.value = true;
    } finally {
      if (current === revision) loading.value = false;
    }
  }

  watch(
    () => [route.path, route.query.id, access.accessToken],
    () => open(),
    { immediate: true },
  );
  onActivated(() => {
    active = true;
    void open();
  });
  onDeactivated(() => {
    active = false;
    attemptedKey = '';
    cancel();
  });
  onBeforeUnmount(() => {
    active = false;
    cancel();
  });
  return {
    deepLinkResetVersion: resetVersion,
    deepLinkRecord: record,
    deepLinkLoading: loading,
    deepLinkError: error,
    retryDeepLink: () => open(true),
    cancelDeepLink: cancel,
  };
}
