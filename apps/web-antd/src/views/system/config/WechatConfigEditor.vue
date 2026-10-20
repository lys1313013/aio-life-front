<script setup lang="ts">
import type { SystemConfigVO } from '#/api/system/system-config';

import { reactive, ref, watch } from 'vue';

import { Button, Form, Input, Select, Switch } from 'ant-design-vue';

const props = defineProps<{ config: SystemConfigVO; saving: boolean }>();
const emit = defineEmits<{ save: [value: string] }>();
const advanced = ref(false);
const secretConfigured = ref(false);
const defaults = {
  enabled: false,
  appId: '',
  appSecret: '',
  subscribeEnabled: false,
  templateId: '',
  titleField: 'thing1',
  contentField: 'thing2',
  timeField: 'time3',
  environment: 'formal',
  webScanEnabled: false,
  webScanEnvVersion: 'release',
};
const form = reactive({ ...defaults });
watch(
  () => props.config,
  (value) => {
    const data = JSON.parse(value.configValue || '{}');
    for (const key of Object.keys(defaults) as (keyof typeof defaults)[]) {
      Object.assign(form, { [key]: data[key] ?? defaults[key] });
    }
    form.appSecret = '';
    secretConfigured.value = data.appSecretConfigured === true;
  },
  { immediate: true },
);
function save() {
  if (!props.saving) emit('save', JSON.stringify(form));
}
</script>

<template>
  <Form layout="vertical" :disabled="saving" @finish="save">
    <div class="grid grid-cols-1 gap-x-4 md:grid-cols-2">
      <Form.Item label="微信登录">
        <Switch v-model:checked="form.enabled" aria-label="启用微信登录" />
      </Form.Item>
      <Form.Item label="订阅通知">
        <Switch
          v-model:checked="form.subscribeEnabled"
          aria-label="启用微信订阅通知"
        />
      </Form.Item>
      <Form.Item label="AppID">
        <Input v-model:value="form.appId" autocomplete="off" />
      </Form.Item>
      <Form.Item label="AppSecret">
        <Input.Password
          v-model:value="form.appSecret"
          autocomplete="new-password"
          :placeholder="
            secretConfigured ? '已配置，留空保留' : '填写小程序 AppSecret'
          "
        />
      </Form.Item>
    </div>
    <Form.Item label="订阅模板 ID">
      <Input
        v-model:value="form.templateId"
        placeholder="微信后台选用的模板 ID"
      />
    </Form.Item>
    <Button type="link" class="mb-3 px-0" @click="advanced = !advanced">
      {{ advanced ? '收起高级设置' : '高级设置' }}
    </Button>
    <div v-if="advanced" class="grid grid-cols-1 gap-x-4 md:grid-cols-2">
      <Form.Item label="标题字段">
        <Input
          v-model:value="form.titleField"
          placeholder="例如 thing1，不使用则留空"
        />
      </Form.Item>
      <Form.Item label="内容字段">
        <Input
          v-model:value="form.contentField"
          placeholder="例如 thing2，不使用则留空"
        />
      </Form.Item>
      <Form.Item label="时间字段">
        <Input
          v-model:value="form.timeField"
          placeholder="例如 time3，不使用则留空"
        />
      </Form.Item>
      <Form.Item label="通知打开版本">
        <Select
          v-model:value="form.environment"
          :options="[
            { label: '正式版', value: 'formal' },
            { label: '体验版', value: 'trial' },
            { label: '开发版', value: 'developer' },
          ]"
        />
      </Form.Item>
      <Form.Item label="网页微信扫码登录">
        <Switch
          v-model:checked="form.webScanEnabled"
          aria-label="启用网页微信扫码登录"
        />
      </Form.Item>
      <Form.Item label="网页扫码使用版本">
        <Select
          v-model:value="form.webScanEnvVersion"
          :options="[
            { label: '正式版', value: 'release' },
            { label: '体验版', value: 'trial' },
            { label: '开发版', value: 'develop' },
          ]"
        />
      </Form.Item>
    </div>
    <div class="flex justify-end">
      <Button type="primary" html-type="submit" :loading="saving">保存</Button>
    </div>
  </Form>
</template>
