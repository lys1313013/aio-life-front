<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';

import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { AuthenticationLogin, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { useAuthStore } from '#/store';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();
const router = useRouter();

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: $t('authentication.usernameTip'),
      },
      fieldName: 'username',
      label: $t('authentication.username'),
      rules: z.string().min(1, { message: $t('authentication.usernameTip') }),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: $t('authentication.password'),
      },
      fieldName: 'password',
      label: $t('authentication.password'),
      rules: z.string().min(1, { message: $t('authentication.passwordTip') }),
    },
  ];
});
</script>

<template>
  <AuthenticationLogin
    :form-schema="formSchema"
    :loading="authStore.loginLoading"
    :show-code-login="false"
    :show-forget-password="true"
    :show-qrcode-login="false"
    :show-third-party-login="false"
    @submit="authStore.authLogin"
  >
    <template #to-register>
      <div class="mt-3 flex items-center justify-center gap-2 text-sm">
        <span class="text-muted-foreground">
          {{ $t('authentication.accountTip') }}
        </span>
        <span
          class="vben-link text-sm font-normal"
          @click="router.push('/auth/register')"
        >
          {{ $t('authentication.createAccount') }}
        </span>
      </div>
    </template>
  </AuthenticationLogin>
</template>
