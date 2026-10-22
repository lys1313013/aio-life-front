<script setup lang="ts">
import type { SystemConfigVO } from '#/api/system/system-config';

import { reactive, ref, watch } from 'vue';

import { Button, Checkbox, Form, Input } from 'ant-design-vue';

const props = defineProps<{ config: SystemConfigVO; saving: boolean }>();
const emit = defineEmits<{ save: [value: string] }>();
const configured = ref(false);
const form = reactive({
  browserKey: '',
  clearBrowserKey: false,
  mapStyleId: 'style1',
});
watch(
  () => props.config,
  (config) => {
    const value = JSON.parse(config.configValue || '{}');
    configured.value = value.browserKeyConfigured === true;
    Object.assign(form, {
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
      <Form.Item label="腾讯地图 Key">
        <Input.Password
          v-model:value="form.browserKey"
          aria-label="腾讯地图 Key"
          autocomplete="new-password"
          :maxlength="256"
          :disabled="saving || form.clearBrowserKey"
          :placeholder="
            configured ? '已配置，留空保留' : '腾讯位置服务控制台中的 Key'
          "
        />
        <Checkbox
          v-if="configured"
          v-model:checked="form.clearBrowserKey"
          class="mt-2"
          @change="form.browserKey = ''"
        >
          清除腾讯地图 Key
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
    </div>
    <div class="flex justify-end">
      <Button type="primary" html-type="submit" :loading="saving">保存</Button>
    </div>
  </Form>
</template>
