<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';

import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { AuthenticationLogin, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { getWechatWebCapabilities } from '#/api/core/wechat-web';
import { useAuthStore } from '#/store';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();
const router = useRouter();
const wechatWebEnabled = ref(false);
onMounted(async () => {
  try {
    const capabilities = await getWechatWebCapabilities();
    wechatWebEnabled.value = capabilities.enabled;
  } catch {
    /* 账号密码登录保持可用，接口错误由请求层统一提示。 */
  }
});

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
    :show-qrcode-login="wechatWebEnabled"
    :show-third-party-login="false"
    @submit="authStore.authLogin"
  >
    <template #to-register>
      <button
        type="button"
        class="vben-link mt-3 w-full text-sm"
        @click="router.push('/auth/app-qrcode-login')"
      >
        App 扫码登录
      </button>
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
