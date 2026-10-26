<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';

import { useAccessStore } from '@vben/stores';

import { Button, Input } from 'ant-design-vue';

import {
  resetSecondaryPasswordApi,
  sendResetSecondaryPasswordCodeApi,
  setSecondaryPasswordApi,
} from '#/api/core/auth';
import { AppModal } from '#/components/app-modal';
import NumericPasswordPad from '#/components/NumericPasswordPad.vue';

const props = withDefaults(
  defineProps<{ mode?: 'change' | 'create' | 'recovery'; open: boolean }>(),
  { mode: 'create' },
);
const emit = defineEmits<{ saved: []; 'update:open': [open: boolean] }>();
const access = useAccessStore();
const busy = ref(false);
const code = ref('');
const error = ref('');
const first = ref('');
const oldPassword = ref('');
const password = ref('');
const sending = ref(false);
const step = ref('new');
const resetting = ref(false);
let revision = 0;
function clear() {
  revision++;
  password.value = '';
  first.value = '';
  oldPassword.value = '';
  code.value = '';
  error.value = '';
  busy.value = false;
  sending.value = false;
}
watch(
  () => [props.open, props.mode, access.accessToken],
  () => {
    clear();
    resetting.value = props.mode === 'recovery';
    step.value =
      props.mode === 'recovery'
        ? 'code'
        : props.mode === 'change'
          ? 'old'
          : 'new';
  },
  { immediate: true },
);
onBeforeUnmount(clear);
watch(
  () => access.accessToken,
  () => emit('update:open', false),
  { flush: 'sync' },
);
function startRecovery() {
  clear();
  resetting.value = true;
  step.value = 'code';
}
async function sendCode() {
  if (sending.value || busy.value) return;
  const version = revision;
  sending.value = true;
  try {
    await sendResetSecondaryPasswordCodeApi();
  } catch {
    /* 请求客户端统一提示。 */
  } finally {
    if (version === revision) sending.value = false;
  }
}
async function submit() {
  if (busy.value) return;
  error.value = '';
  if (step.value === 'old') {
    if (!/^\d{4,}$/.test(password.value)) {
      error.value = '至少输入 4 位纯数字';
      return;
    }
    oldPassword.value = password.value;
    password.value = '';
    step.value = 'new';
    return;
  }
  if (step.value === 'code') {
    if (!code.value.trim()) {
      error.value = '请输入邮箱验证码';
      return;
    }
    step.value = 'new';
    return;
  }
  if (!/^\d{4,}$/.test(password.value)) {
    error.value = '至少输入 4 位纯数字';
    return;
  }
  if (step.value === 'new') {
    first.value = password.value;
    password.value = '';
    step.value = 'confirm';
    return;
  }
  if (password.value !== first.value) {
    error.value = '两次输入的密码不一致';
    return;
  }
  const version = revision;
  busy.value = true;
  try {
    if (resetting.value)
      await resetSecondaryPasswordApi({
        code: code.value.trim(),
        password: first.value,
      });
    else
      await setSecondaryPasswordApi({
        password: first.value,
        ...(oldPassword.value ? { oldPassword: oldPassword.value } : {}),
      });
    if (version !== revision) return;
    clear();
    emit('saved');
    emit('update:open', false);
  } catch {
    if (version === revision) {
      if (resetting.value) step.value = 'code';
      else if (oldPassword.value) {
        step.value = 'old';
        password.value = oldPassword.value;
      }
    }
    // 保留表单，由请求客户端统一提示。
  } finally {
    if (version === revision) busy.value = false;
  }
}
</script>

<template>
  <AppModal
    :open="open"
    :footer="false"
    :busy="busy || sending"
    :width="320"
    :body-style="{ padding: '16px' }"
    title="二级密码"
    @update:open="emit('update:open', $event)"
  >
    <div v-if="step === 'code'" class="space-y-4">
      <div class="text-sm font-medium">找回二级密码</div>
      <Input
        v-model:value="code"
        aria-label="邮箱验证码"
        placeholder="绑定邮箱收到的验证码"
      >
        <template #suffix>
          <Button type="link" size="small" :loading="sending" @click="sendCode">
            发送验证码
          </Button>
        </template>
      </Input>
      <p v-if="error" role="alert" class="text-xs text-destructive">
        {{ error }}
      </p>
      <Button type="primary" block @click="submit">下一步</Button>
    </div>
    <NumericPasswordPad
      v-else
      v-model:value="password"
      :title="
        step === 'old'
          ? '验证旧二级密码'
          : step === 'new'
            ? '设置数字二级密码'
            : '再次输入密码'
      "
      :recovery="step === 'old'"
      :error="error"
      :busy="busy"
      @update:value="error = ''"
      @submit="submit"
      @recover="startRecovery"
    />
  </AppModal>
</template>
