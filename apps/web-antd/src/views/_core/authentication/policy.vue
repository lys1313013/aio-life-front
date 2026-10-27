<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';

import { Button, Spin } from 'ant-design-vue';

import LegalPolicyContent from '#/components/legal-policy/LegalPolicyContent.vue';
import { useLegalPolicy } from '#/components/legal-policy/use-legal-policy';

const route = useRoute();
const kind = computed(() =>
  route.query.kind === 'terms' ? 'terms' : 'privacy',
);
const { policy, loading, error, load } = useLegalPolicy();
onMounted(load);
</script>
<template>
  <section class="mx-auto w-full max-w-2xl space-y-4">
    <h1 class="text-xl font-semibold">
      {{ kind === 'terms' ? '服务条款' : '隐私政策' }}
    </h1>
    <Spin :spinning="loading">
      <div v-if="error" role="alert">
        {{ error }}<Button @click="load">重试</Button>
      </div>
      <LegalPolicyContent v-if="policy" :policy="policy" :kind="kind" />
    </Spin>
    <RouterLink
      class="inline-flex min-h-11 items-center text-primary"
      to="/auth/login"
    >
      返回登录
    </RouterLink>
  </section>
</template>
