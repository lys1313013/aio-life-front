<script lang="ts" setup>
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { LOGIN_PATH } from '@vben/constants';

import { Button, Spin } from 'ant-design-vue';
import QRCode from 'qrcode';

import { useAuthStore } from '#/store';

import { useQrLogin } from './use-qr-login';

defineOptions({ name: 'AppQrCodeLogin' });
const router = useRouter();
const auth = useAuthStore();
const {
  ticket,
  status,
  loading,
  finishing,
  error,
  remaining,
  terminal,
  text,
  refresh,
  retry,
} = useQrLogin((token) => auth.completeLogin(token));
const qrImage = ref('');
watch(
  () => ticket.value?.qrContent,
  async (content) => {
    qrImage.value = '';
    if (!content) return;
    try {
      const image = await QRCode.toDataURL(content, {
        width: 256,
        margin: 4,
        errorCorrectionLevel: 'M',
      });
      if (ticket.value?.qrContent === content) qrImage.value = image;
    } catch {
      if (ticket.value?.qrContent === content) {
        status.value = 'FAILED';
        error.value = '二维码生成失败，请重试';
      }
    }
  },
);
</script>

<template>
  <div class="mx-auto flex w-full max-w-sm flex-col items-center gap-4">
    <h1 class="text-2xl font-semibold text-foreground">App 扫码登录</h1>
    <div
      class="relative flex h-64 w-64 max-w-full items-center justify-center rounded-xl bg-card"
    >
      <Spin
        v-if="loading || (!qrImage && !error)"
        aria-label="正在生成二维码"
      />
      <img
        v-else-if="qrImage && !terminal && status === 'WAITING'"
        :src="qrImage"
        alt="AIO Life 登录二维码"
        class="h-full w-full rounded-xl"
      />
      <div
        v-else
        class="flex flex-col items-center gap-4 p-4 text-center"
        role="status"
      >
        <Spin v-if="!terminal" />
        <span>{{ text }}</span>
        <Button v-if="terminal" :loading="loading" @click="refresh">
          刷新二维码
        </Button>
      </div>
    </div>
    <p
      v-if="ticket && !terminal && status === 'WAITING'"
      class="text-center text-sm text-muted-foreground"
      role="status"
    >
      {{ text }}
    </p>
    <p v-if="ticket && !terminal" class="text-sm text-muted-foreground">
      核对码
      <span class="font-mono font-semibold text-foreground">{{
        ticket.verificationCode
      }}</span>
      <span v-if="status === 'WAITING'" class="ml-3">{{ remaining }} 秒</span>
    </p>
    <p v-if="error" role="alert" class="text-center text-sm text-destructive">
      {{ error }}
    </p>
    <Button
      v-if="error && !terminal"
      :loading="loading || finishing"
      @click="retry"
    >
      重试
    </Button>
    <Button
      class="w-full"
      type="link"
      :disabled="finishing"
      @click="router.push(LOGIN_PATH)"
    >
      返回账号登录
    </Button>
  </div>
</template>
