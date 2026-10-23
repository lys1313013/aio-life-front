<script setup lang="ts">
import type { SystemConfigVO } from '#/api/system/system-config';

import { reactive, ref, watch } from 'vue';

import { Button, Checkbox, Form, Input, InputNumber } from 'ant-design-vue';

const props = defineProps<{ config: SystemConfigVO; saving: boolean }>();
const emit = defineEmits<{ save: [value: string] }>();
const configured = ref(false);
const serviceConfigured = ref(false);
const form = reactive({
  serviceKey: '',
  clearServiceKey: false,
  timeoutMs: 5000,
  browserKey: '',
  clearBrowserKey: false,
  mapStyleId: 'style1',
});
watch(
  () => props.config,
  (config) => {
    const value = JSON.parse(config.configValue || '{}');
    configured.value = value.browserKeyConfigured === true;
    serviceConfigured.value = value.serviceKeyConfigured === true;
    Object.assign(form, {
      serviceKey: '',
      clearServiceKey: false,
      timeoutMs: value.timeoutMs ?? 5000,
      browserKey: '',
      clearBrowserKey: false,
      mapStyleId: value.mapStyleId || 'style1',
    });
  },
  { immediate: true },
);
function save() {
  if (!props.saving) emit('save', JSON.stringify(form));
}
</script>
<template>
  <Form layout="vertical" :model="form" :disabled="saving" @finish="save">
    <div class="grid grid-cols-1 gap-x-4 md:grid-cols-2">
      <Form.Item label="地图展示 Key">
        <Input.Password
          v-model:value="form.browserKey"
          aria-label="地图展示 Key"
          autocomplete="new-password"
          :maxlength="256"
          :disabled="saving || form.clearBrowserKey"
          :placeholder="
            configured ? '已配置，留空保留' : '用于 JavaScript API GL 地图展示'
          "
        />
        <Checkbox
          v-if="configured"
          v-model:checked="form.clearBrowserKey"
          class="mt-2"
          @change="form.browserKey = ''"
        >
          清除展示 Key
        </Checkbox>
      </Form.Item>
      <Form.Item label="搜索解析 Key">
        <Input.Password
          v-model:value="form.serviceKey"
          aria-label="腾讯搜索解析 Key"
          autocomplete="new-password"
          :maxlength="256"
          :disabled="saving || form.clearServiceKey"
          :placeholder="
            serviceConfigured
              ? '已配置，留空保留'
              : '用于地点搜索、地址解析和选点地址回填'
          "
        />
        <Checkbox
          v-if="serviceConfigured"
          v-model:checked="form.clearServiceKey"
          class="mt-2"
          @change="form.serviceKey = ''"
        >
          清除搜索解析 Key
        </Checkbox>
      </Form.Item>
      <Form.Item label="样式编号">
        <Input
          v-model:value="form.mapStyleId"
          aria-label="腾讯地图样式编号"
          :maxlength="11"
          placeholder="style1（须在腾讯控制台绑定白浅样式）"
        />
      </Form.Item>
      <Form.Item
        label="搜索解析超时（毫秒）"
        name="timeoutMs"
        :rules="[{ required: true, type: 'integer', min: 1000, max: 15000 }]"
      >
        <InputNumber
          v-model:value="form.timeoutMs"
          aria-label="腾讯搜索解析超时（毫秒）"
          :min="1000"
          :max="15000"
          :precision="0"
          class="w-full"
        />
      </Form.Item>
    </div>
    <div class="flex justify-end">
      <Button type="primary" html-type="submit" :loading="saving">保存</Button>
    </div>
  </Form>
</template>
