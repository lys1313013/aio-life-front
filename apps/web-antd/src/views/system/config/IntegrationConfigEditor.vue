<script setup lang="ts">
import type { SystemConfigVO } from '#/api/system/system-config';

import { reactive, ref, watch } from 'vue';

import { Button, Checkbox, Form, Input } from 'ant-design-vue';

const props = defineProps<{ config: SystemConfigVO; saving: boolean }>();
const emit = defineEmits<{ save: [value: string] }>();
const apiKeyConfigured = ref(false);
const defaults = {
  apiKey: '',
  clearApiKey: false,
  baseUrl: 'https://api.devil.ai',
};
const form = reactive({ ...defaults });
watch(
  () => props.config,
  (config) => {
    const value = JSON.parse(config.configValue || '{}');
    for (const key of Object.keys(defaults) as (keyof typeof defaults)[]) {
      Object.assign(form, { [key]: value[key] ?? defaults[key] });
    }
    form.apiKey = '';
    form.clearApiKey = false;
    apiKeyConfigured.value = value.apiKeyConfigured === true;
  },
  { immediate: true },
);
function save() {
  if (props.saving) return;
  const { apiKey, clearApiKey, baseUrl } = form;
  emit('save', JSON.stringify({ apiKey, clearApiKey, baseUrl }));
}
</script>

<template>
  <Form layout="vertical" :model="form" :disabled="saving" @finish="save">
    <div class="grid grid-cols-1 gap-x-4 md:grid-cols-2">
      <Form.Item label="API Key">
        <Input.Password
          v-model:value="form.apiKey"
          aria-label="API Key"
          autocomplete="new-password"
          :maxlength="2048"
          :disabled="saving || form.clearApiKey"
          :placeholder="
            apiKeyConfigured ? '已配置，留空保留' : '请输入 API Key'
          "
        />
        <Checkbox
          v-if="apiKeyConfigured"
          v-model:checked="form.clearApiKey"
          class="mt-2"
          @change="form.apiKey = ''"
        >
          清除 API Key
        </Checkbox>
      </Form.Item>
      <Form.Item
        label="接口地址"
        name="baseUrl"
        :rules="[
          { required: true, type: 'url', message: '请输入有效的 HTTPS 地址' },
        ]"
      >
        <Input
          v-model:value="form.baseUrl"
          aria-label="接口地址"
          :maxlength="2048"
        />
      </Form.Item>
    </div>
    <div class="flex justify-end">
      <Button type="primary" html-type="submit" :loading="saving">保存</Button>
    </div>
  </Form>
</template>
