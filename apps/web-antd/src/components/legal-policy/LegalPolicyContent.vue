<script setup lang="ts">
import type { LegalPolicies } from '#/api/core/legal';

import { computed } from 'vue';

const props = defineProps<{
  kind: 'privacy' | 'terms';
  policy: LegalPolicies;
}>();
const sections = computed(() =>
  props.kind === 'terms' ? props.policy.terms : props.policy.privacy,
);
</script>
<template>
  <article
    class="space-y-4 break-words text-sm leading-relaxed text-foreground"
  >
    <p class="text-muted-foreground">
      版本 {{ policy.version }} · 生效日期 {{ policy.effectiveDate }}
    </p>
    <div class="space-y-1">
      <p>运营主体：{{ policy.operator || '尚未配置，发布前需补充' }}</p>
      <p>隐私联系邮箱：{{ policy.contactEmail || '尚未配置，发布前需补充' }}</p>
    </div>
    <section
      v-for="(section, index) in sections"
      :key="section[0]"
      class="space-y-1"
    >
      <h2 class="font-semibold">{{ index + 1 }}. {{ section[0] }}</h2>
      <p>{{ section[1] }}</p>
    </section>
  </article>
</template>
