import { ref, watchEffect } from 'vue';

import { fetchAuthImageUrl } from '#/utils/file';

export function useAuthImageUrl(
  source: () => number | string | null | undefined,
) {
  const blobUrl = ref('');
  const loading = ref(false);
  const error = ref(false);

  watchEffect(async (onCleanup) => {
    let cancelled = false;
    onCleanup(() => {
      cancelled = true;
    });

    const id = source();
    if (!id) {
      blobUrl.value = '';
      loading.value = false;
      error.value = false;
      return;
    }

    loading.value = true;
    error.value = false;

    try {
      const url = await fetchAuthImageUrl(id);
      if (!cancelled) {
        blobUrl.value = url;
        loading.value = false;
      }
    } catch {
      if (!cancelled) {
        error.value = true;
        loading.value = false;
      }
    }
  });

  return { blobUrl, loading, error };
}
