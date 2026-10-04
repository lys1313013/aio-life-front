<script lang="ts" setup>
import type {
  WechatWebChallenge,
  WechatWebStatus,
} from '#/api/core/wechat-web';

import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { LOGIN_PATH } from '@vben/constants';

import { ReloadOutlined } from '@ant-design/icons-vue';
import { Button, Spin } from 'ant-design-vue';

import {
  createWechatWebLogin,
  getWechatWebStatus,
  revokeWechatWebLogin,
} from '#/api/core/wechat-web';
import { useAuthStore } from '#/store';

defineOptions({ name: 'QrCodeLogin' });
const authStore = useAuthStore();
const router = useRouter();
const challenge = ref<null | WechatWebChallenge>(null);
const status = ref<'ERROR' | 'LOADING' | WechatWebStatus>('LOADING');
let revision = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let deadline = 0;
const message = computed(
  () =>
    ({
      CANCELLED: '已取消登录',
      CONFIRMED: '正在登录',
      CONSUMED: '二维码已使用，请刷新',
      ERROR: '连接失败，请重试',
      EXPIRED: '二维码已过期',
      LOADING: '正在准备二维码',
      SCANNED: '已扫码，请在小程序确认',
      WAITING: '使用微信扫一扫',
    })[status.value],
);
const canRefresh = computed(() =>
  ['CANCELLED', 'CONSUMED', 'ERROR', 'EXPIRED'].includes(status.value),
);

function stop() {
  if (timer) clearTimeout(timer);
  timer = undefined;
}
async function revoke(value: null | WechatWebChallenge) {
  if (value) {
    try {
      await revokeWechatWebLogin(value);
    } catch {
      /* 服务端到期后自动失效。 */
    }
  }
}
async function refresh() {
  const current = ++revision;
  stop();
  const previous = challenge.value;
  challenge.value = null;
  status.value = 'LOADING';
  await revoke(previous);
  if (current !== revision) return;
  try {
    const value = await createWechatWebLogin();
    if (current !== revision) {
      void revoke(value);
      return;
    }
    challenge.value = value;
    deadline = Date.now() + value.expiresIn * 1000;
    status.value = 'WAITING';
    schedule(current);
  } catch {
    if (current === revision) status.value = 'ERROR';
  }
}
function schedule(current: number) {
  timer = setTimeout(() => {
    void poll(current);
  }, 1500);
}
async function poll(current: number) {
  const value = challenge.value;
  if (!value || current !== revision) return;
  if (Date.now() >= deadline) {
    status.value = 'EXPIRED';
    return;
  }
  try {
    const result = await getWechatWebStatus(value);
    if (current !== revision) return;
    status.value = result.status;
    if (result.status === 'CONFIRMED') {
      // 不自动重试兑换：服务端的一次性凭证可能已经消费。
      await authStore.authWechatLogin(value);
      return;
    }
    if (result.status === 'WAITING' || result.status === 'SCANNED')
      schedule(current);
  } catch {
    if (current === revision) status.value = 'ERROR';
  }
}
onMounted(refresh);
onBeforeUnmount(() => {
  ++revision;
  stop();
  void revoke(challenge.value);
  challenge.value = null;
});
</script>

<template>
  <section
    class="mx-auto w-full max-w-sm text-center"
    aria-labelledby="wechat-login-title"
  >
    <h1 id="wechat-login-title" class="mb-8 text-3xl font-bold">
      微信扫码登录
    </h1>
    <div
      class="mx-auto flex h-[280px] w-[280px] max-w-full items-center justify-center"
    >
      <Spin
        v-if="status === 'LOADING' || status === 'CONFIRMED'"
        size="large"
      />
      <Button
        v-else-if="canRefresh"
        size="large"
        aria-label="刷新二维码"
        @click="refresh"
      >
        <ReloadOutlined />
      </Button>
      <img
        v-else-if="challenge"
        :src="challenge.qrCode"
        alt="微信登录小程序码"
        class="h-full w-full rounded-lg"
      />
    </div>
    <p
      class="mt-4 min-h-6 text-sm text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      {{ message }}
    </p>
    <Button
      class="mt-6"
      type="link"
      :disabled="status === 'CONFIRMED'"
      @click="router.push(LOGIN_PATH)"
    >
      账号密码登录
    </Button>
  </section>
</template>
