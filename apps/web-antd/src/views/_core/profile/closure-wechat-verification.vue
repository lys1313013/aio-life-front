<script setup lang="ts">
import type {
  WechatWebChallenge,
  WechatWebCredentials,
} from '#/api/core/wechat-web';

import { onBeforeUnmount, ref } from 'vue';

import { Button } from 'ant-design-vue';

import {
  createWechatWebLogin,
  getWechatWebStatus,
  revokeWechatWebLogin,
} from '#/api/core/wechat-web';

const props = defineProps<{ disabled?: boolean }>();
const emit = defineEmits<{ verified: [value: null | WechatWebCredentials] }>();
const challenge = ref<null | WechatWebChallenge>(null);
const loading = ref(false);
const status = ref('');
let deadline = 0;
let revision = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
async function revoke(value: null | WechatWebChallenge) {
  if (value)
    try {
      await revokeWechatWebLogin(value);
    } catch {
      /* 到期自动失效 */
    }
}
async function start() {
  if (loading.value || props.disabled) return;
  const current = ++revision;
  clearTimeout(timer);
  emit('verified', null);
  loading.value = true;
  const previous = challenge.value;
  challenge.value = null;
  await revoke(previous);
  try {
    const value = await createWechatWebLogin();
    if (current !== revision) {
      void revoke(value);
      return;
    }
    challenge.value = value;
    deadline = Date.now() + value.expiresIn * 1000;
    status.value = '使用本账号绑定的微信扫码，并在小程序确认身份';
    timer = setTimeout(() => poll(current), 1500);
  } catch {
    if (current === revision) status.value = '二维码加载失败，请重试';
  } finally {
    if (current === revision) loading.value = false;
  }
}
async function poll(current: number) {
  if (!challenge.value || current !== revision) return;
  if (Date.now() >= deadline) {
    status.value = '二维码已过期，请重新验证';
    emit('verified', null);
    return;
  }
  try {
    const result = await getWechatWebStatus(challenge.value);
    if (current !== revision) return;
    if (result.status === 'CONFIRMED') {
      emit('verified', {
        scene: challenge.value.scene,
        browserSecret: challenge.value.browserSecret,
      });
      status.value = '微信已确认，请核对后点击注销账号';
      timer = setTimeout(
        () => {
          if (current === revision) {
            emit('verified', null);
            status.value = '身份验证已过期，请重试';
          }
        },
        Math.max(0, deadline - Date.now()),
      );
      return;
    }
    if (!['SCANNED', 'WAITING'].includes(result.status)) {
      status.value = '身份验证已失效，请重试';
      return;
    }
    timer = setTimeout(() => poll(current), 1500);
  } catch {
    if (current === revision) status.value = '验证状态获取失败，请重试';
  }
}
onBeforeUnmount(() => {
  ++revision;
  clearTimeout(timer);
  void revoke(challenge.value);
  emit('verified', null);
});
</script>
<template>
  <div class="space-y-2">
    <Button :loading="loading" :disabled="disabled" @click="start">
      {{ challenge ? '重新微信验证' : '使用微信验证身份' }}
    </Button>
    <img
      v-if="challenge"
      :src="challenge.qrCode"
      alt="账号注销身份验证二维码"
      class="h-48 w-48 max-w-full"
    />
    <p role="status" class="text-sm text-muted-foreground">{{ status }}</p>
  </div>
</template>
