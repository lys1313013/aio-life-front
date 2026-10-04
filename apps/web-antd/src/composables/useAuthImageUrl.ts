import { ref, watchEffect } from 'vue';

import { fetchAuthImageUrl } from '#/utils/file';

export function useAuthImageUrl(
  source: () => null | number | string | undefined,
  publicSource?: () => null | string | undefined,
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
    const publicUrl = publicSource?.();
    blobUrl.value = '';
    error.value = false;
    if (publicUrl) {
      loading.value = true;
      const image = new Image();
      image.onload = () => {
        if (!cancelled) {
          blobUrl.value = publicUrl;
          loading.value = false;
        }
      };
      image.onerror = () => {
        if (!cancelled) {
          error.value = true;
          loading.value = false;
        }
      };
      image.src = publicUrl;
      onCleanup(() => {
        cancelled = true;
        image.onload = null;
        image.onerror = null;
      });
      return;
    }
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
