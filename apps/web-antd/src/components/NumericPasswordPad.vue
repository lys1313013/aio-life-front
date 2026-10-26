<script setup lang="ts">
import { computed } from 'vue';

import { createIconifyIcon } from '@vben/icons';

import { LoadingOutlined } from '@ant-design/icons-vue';

const props = withDefaults(
  defineProps<{
    busy?: boolean;
    error?: string;
    recovery?: boolean;
    title?: string;
    value?: string;
  }>(),
  { value: '', title: '二级密码', busy: false, error: '', recovery: false },
);
const emit = defineEmits<{
  recover: [];
  submit: [];
  'update:value': [value: string];
}>();
const BackspaceIcon = createIconifyIcon('svg:keypad-backspace');
const ConfirmIcon = createIconifyIcon('svg:keypad-confirm');

const valid = computed(() => /^\d{4,}$/.test(props.value));
function update(value: string) {
  if (!props.busy) emit('update:value', value.replaceAll(/\D/g, ''));
}
function submit() {
  if (!props.busy && valid.value) emit('submit');
}
</script>

<template>
  <div
    class="numeric-password-pad"
    data-enter-submit="ignore"
    :aria-busy="busy"
  >
    <div class="pin-title">{{ title }}</div>
    <div class="pin-entry">
      <input
        :value="value"
        type="password"
        inputmode="none"
        autocomplete="off"
        aria-label="二级密码"
        placeholder="至少 4 位数字"
        :disabled="busy"
        :aria-invalid="!!error"
        @input="update(($event.target as HTMLInputElement).value)"
        @keydown.enter.prevent="submit"
      />
      <div class="pin-error" role="alert">{{ error }}</div>
    </div>
    <div class="pin-keys">
      <button
        v-for="digit in ['1', '2', '3', '4', '5', '6', '7', '8', '9']"
        :key="digit"
        type="button"
        class="pin-key pin-digit"
        :aria-label="digit"
        :disabled="busy"
        @click="update(value + digit)"
      >
        {{ digit }}
      </button>
      <button
        type="button"
        class="pin-key"
        aria-label="删除一位"
        :disabled="busy || !value"
        @click="update(value.slice(0, -1))"
      >
        <BackspaceIcon class="pin-action-icon" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="pin-key pin-digit"
        aria-label="0"
        :disabled="busy"
        @click="update(`${value}0`)"
      >
        0
      </button>
      <button
        type="button"
        class="pin-key pin-confirm"
        aria-label="确认密码"
        :disabled="busy || !valid"
        @click="submit"
      >
        <LoadingOutlined v-if="busy" spin /><ConfirmIcon
          v-else
          class="pin-action-icon"
          aria-hidden="true"
        />
      </button>
    </div>
    <div v-if="recovery" class="pin-footer">
      <button type="button" :disabled="busy" @click="emit('recover')">
        忘记密码
      </button>
    </div>
  </div>
</template>

<style scoped>
.numeric-password-pad {
  color: hsl(var(--foreground));
}

.pin-title {
  padding: 4px 8px;
  font-size: 14px;
  font-weight: 500;
}

.pin-entry {
  position: relative;
  padding: 16px 8px 28px;
}

.pin-entry input {
  width: 100%;
  height: 38px;
  padding: 0 4px;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: center;
  font-size: 24px;
  letter-spacing: 5px;
}

.pin-entry input::placeholder {
  color: hsl(var(--muted-foreground));
  font-size: 13px;
  letter-spacing: normal;
}

.pin-error {
  position: absolute;
  right: 0;
  bottom: 4px;
  left: 0;
  color: hsl(var(--destructive));
  font-size: 12px;
  text-align: center;
  overflow-wrap: anywhere;
}

.pin-keys {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  justify-items: center;
}

.pin-key {
  display: flex;
  width: 56px;
  height: 56px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  font-size: 24px;
  cursor: pointer;
}

.pin-digit {
  border: 1px solid hsl(var(--border));
  font-weight: 400;
}

.pin-key:hover:enabled {
  background: hsl(var(--accent));
}

.pin-key:disabled {
  opacity: 0.6;
  cursor: default;
}

.pin-action-icon {
  width: 32px;
  height: 32px;
}

.pin-confirm {
  color: inherit;
  font-size: 28px;
}

.pin-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.pin-footer button {
  min-height: 44px;
  padding: 8px;
  border: 0;
  background: transparent;
  color: hsl(var(--muted-foreground));
  font-size: 12px;
  cursor: pointer;
}
</style>
