<script setup lang="ts">
import type { SystemConfigVO } from '#/api/system/system-config';

import { computed, reactive, ref, watch } from 'vue';

import {
  Button,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Switch,
} from 'ant-design-vue';

const props = defineProps<{ config: SystemConfigVO; saving: boolean }>();
const emit = defineEmits<{ save: [value: string] }>();
const typesafe = computed(
  () => props.config.configKey === 'typesafe.recommendation',
);
const apiKeyConfigured = ref(false);
const defaults = {
  apiKey: '',
  clearApiKey: false,
  enabled: true,
  model: 'jev-latest',
  requestTimeoutMs: 1500,
  dataCacheTtlMs: 18_000_000,
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
  const {
    apiKey,
    clearApiKey,
    enabled,
    model,
    requestTimeoutMs,
    dataCacheTtlMs,
    baseUrl,
  } = form;
  emit(
    'save',
    JSON.stringify(
      typesafe.value
        ? {
            apiKey,
            clearApiKey,
            enabled,
            model,
            requestTimeoutMs,
            dataCacheTtlMs,
          }
        : { apiKey, clearApiKey, baseUrl },
    ),
  );
}
</script>

<template>
  <Form layout="vertical" :model="form" :disabled="saving" @finish="save">
    <Form.Item v-if="typesafe" label="启用智能推荐">
      <Switch v-model:checked="form.enabled" aria-label="启用智能推荐" />
    </Form.Item>
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
        v-if="typesafe"
        label="模型"
        name="model"
        :rules="[
          {
            required: true,
            pattern: /^[\w./:-]{1,128}$/,
            message: '请输入有效模型名称',
          },
        ]"
      >
        <Input v-model:value="form.model" aria-label="模型" :maxlength="128" />
      </Form.Item>
      <Form.Item
        v-else
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
      <template v-if="typesafe">
        <Form.Item
          label="请求超时（毫秒）"
          name="requestTimeoutMs"
          :rules="[{ required: true, type: 'integer', min: 1, max: 60000 }]"
        >
          <InputNumber
            v-model:value="form.requestTimeoutMs"
            aria-label="请求超时（毫秒）"
            :min="1"
            :max="60000"
            :precision="0"
            class="w-full"
          />
        </Form.Item>
        <Form.Item
          label="数据缓存时长（毫秒，0 为关闭）"
          name="dataCacheTtlMs"
          :rules="[{ required: true, type: 'integer', min: 0, max: 604800000 }]"
        >
          <InputNumber
            v-model:value="form.dataCacheTtlMs"
            aria-label="数据缓存时长（毫秒）"
            :min="0"
            :max="604800000"
            :precision="0"
            class="w-full"
          />
        </Form.Item>
      </template>
    </div>
    <div class="flex justify-end">
      <Button type="primary" html-type="submit" :loading="saving">保存</Button>
    </div>
  </Form>
</template>
