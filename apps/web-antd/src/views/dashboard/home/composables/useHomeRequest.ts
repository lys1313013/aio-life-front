import { onActivated, onBeforeUnmount, onDeactivated, ref } from 'vue';

/** 首页请求共同规则：普通刷新合并，写入后刷新使旧请求失效，离页保留展示数据。 */
export function useHomeRequest<T>(options: {
  apply: (data: T) => void;
  enabled?: () => boolean;
  fetch: () => Promise<T>;
  initialLoading?: boolean;
  onError?: (error: unknown) => void;
  onSettled?: () => void;
  onStart?: () => void;
}) {
  const loading = ref(options.initialLoading ?? false);
  const loaded = ref(false);
  const failed = ref(false);
  let active = true;
  let version = 0;
  let pending: null | Promise<void> = null;

  function invalidate() {
    version++;
    pending = null;
    loading.value = false;
  }
  function current(requestVersion: number) {
    return active && version === requestVersion;
  }
  function load(force = false): Promise<void> {
    if (!active || options.enabled?.() === false) return Promise.resolve();
    if (pending && !force) return pending;
    const requestVersion = ++version;
    loading.value = true;
    failed.value = false;
    options.onStart?.();
    const operation = (async () => {
      try {
        const data = await Promise.resolve().then(options.fetch);
        if (!current(requestVersion)) return;
        options.apply(data);
        loaded.value = true;
      } catch (error) {
        if (!current(requestVersion)) return;
        failed.value = true;
        options.onError?.(error);
      } finally {
        if (current(requestVersion)) {
          loading.value = false;
          pending = null;
          options.onSettled?.();
        }
      }
    })();
    pending = operation;
    return operation;
  }
  onDeactivated(() => {
    active = false;
    invalidate();
  });
  onActivated(() => {
    if (active) return;
    active = true;
    void load();
  });
  onBeforeUnmount(() => {
    active = false;
    invalidate();
  });
  return {
    loading,
    loaded,
    failed,
    load,
    invalidate,
    current,
    version: () => version,
  };
}
