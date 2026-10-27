import type { LegalPolicies } from '#/api/core/legal';

import { ref } from 'vue';

import { getLegalPolicies } from '#/api/core/legal';

export function useLegalPolicy() {
  const policy = ref<LegalPolicies | null>(null);
  const loading = ref(false);
  const error = ref('');
  let revision = 0;
  async function load() {
    if (loading.value) return;
    const current = ++revision;
    loading.value = true;
    error.value = '';
    try {
      const value = await getLegalPolicies();
      if (
        !value?.version ||
        !Array.isArray(value.privacy) ||
        !Array.isArray(value.terms)
      )
        throw new Error('协议格式异常');
      if (current === revision) policy.value = value;
    } catch {
      if (current === revision) error.value = '协议加载失败，请重试';
    } finally {
      if (current === revision) loading.value = false;
    }
  }
  return { policy, loading, error, load };
}
