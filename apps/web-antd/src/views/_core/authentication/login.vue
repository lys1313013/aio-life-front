<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';

import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';

import { AuthenticationLogin, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { getWechatWebCapabilities } from '#/api/core/wechat-web';
import { useAuthStore } from '#/store';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();
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
        class: 'h-11 rounded-xl',
        placeholder: $t('authentication.usernameTip'),
      },
      fieldName: 'username',
      label: $t('authentication.username'),
      rules: z.string().min(1, { message: $t('authentication.usernameTip') }),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        class: 'h-11 rounded-xl',
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
    class="account-login"
    :form-schema="formSchema"
    :loading="authStore.loginLoading"
    :show-code-login="false"
    :show-forget-password="true"
    :show-qrcode-login="false"
    :show-third-party-login="false"
    :title="$t('authentication.welcomeBack')"
    @submit="authStore.authLogin"
  >
    <template #third-party-login>
      <nav
        aria-label="其他登录方式"
        class="mt-3 grid auto-cols-fr grid-flow-col gap-3"
        @keydown.enter.stop
      >
        <RouterLink
          v-if="wechatWebEnabled"
          class="login-alternative"
          to="/auth/qrcode-login"
        >
          微信扫码登录
        </RouterLink>
        <RouterLink class="login-alternative" to="/auth/app-qrcode-login">
          App 扫码登录
        </RouterLink>
      </nav>
    </template>
    <template #to-register>
      <div
        class="mt-7 flex items-center justify-center gap-2 text-sm"
        @keydown.enter.stop
      >
        <span class="text-muted-foreground">
          {{ $t('authentication.accountTip') }}
        </span>
        <RouterLink
          class="text-foreground decoration-border underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          to="/auth/register"
        >
          {{ $t('authentication.createAccount') }}
        </RouterLink>
      </div>
    </template>
  </AuthenticationLogin>
</template>

<style scoped>
.account-login :deep(button[aria-label='login']) {
  height: 2.75rem;
  border-radius: 0.75rem;
}

.login-alternative {
  @apply flex h-11 min-w-0 items-center justify-center rounded-xl bg-foreground/5 px-3 text-sm font-medium text-foreground/75 transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background;
}
</style>
