<script setup lang="ts">
import type { SystemConfigVO } from '#/api/system/system-config';

import { reactive, ref, watch } from 'vue';

import { Button, Checkbox, Form, Input, Select } from 'ant-design-vue';

import { DEFAULT_MAP_SOURCE } from '#/views/my-hub/life-footprints/map-config';

const props = defineProps<{ config: SystemConfigVO; saving: boolean }>();
const emit = defineEmits<{ save: [value: string] }>();
const serviceAkConfigured = ref(false);
const advanced = ref(false);
const defaults = {
  serviceAk: '',
  clearServiceAk: false,
  tileUrl: DEFAULT_MAP_SOURCE.url,
  tileAttribution: DEFAULT_MAP_SOURCE.attribution,
  tileAttributionUrl: DEFAULT_MAP_SOURCE.attributionUrl,
  tileCoordinateSystem: DEFAULT_MAP_SOURCE.coordinateSystem,
};
const form = reactive({ ...defaults });
watch(
  () => props.config,
  (config) => {
    const value = JSON.parse(config.configValue || '{}');
    for (const key of Object.keys(defaults) as (keyof typeof defaults)[]) {
      Object.assign(form, { [key]: value[key] ?? defaults[key] });
    }
    form.serviceAk = '';
    form.clearServiceAk = false;
    serviceAkConfigured.value = value.serviceAkConfigured === true;
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
      <Form.Item label="服务端 AK">
        <Input.Password
          v-model:value="form.serviceAk"
          aria-label="百度地图服务端 AK"
          autocomplete="new-password"
          :maxlength="256"
          :disabled="saving || form.clearServiceAk"
          :placeholder="
            serviceAkConfigured ? '已配置，留空保留' : '用于地点搜索与地址解析'
          "
        />
        <Checkbox
          v-if="serviceAkConfigured"
          v-model:checked="form.clearServiceAk"
          class="mt-2"
          @change="form.serviceAk = ''"
        >
          清除服务端 AK
        </Checkbox>
      </Form.Item>
    </div>
    <Button type="link" class="mb-3 px-0" @click="advanced = !advanced">
      {{ advanced ? '收起底图设置' : '底图设置' }}
    </Button>
    <div v-if="advanced">
      <Form.Item label="底图地址">
        <Input
          v-model:value="form.tileUrl"
          aria-label="底图地址"
          :maxlength="2048"
          placeholder="https://…/{z}/{x}/{y}.png 或本站相对路径"
        />
      </Form.Item>
      <div class="grid grid-cols-1 gap-x-4 md:grid-cols-2">
        <Form.Item label="底图坐标系">
          <Select
            v-model:value="form.tileCoordinateSystem"
            aria-label="底图坐标系"
            :options="[
              { label: 'WGS84（OpenStreetMap 等）', value: 'WGS84' },
              { label: 'GCJ02（国测局坐标）', value: 'GCJ02' },
            ]"
          />
        </Form.Item>
        <Form.Item label="底图署名">
          <Input
            v-model:value="form.tileAttribution"
            aria-label="底图署名"
            :maxlength="200"
          />
        </Form.Item>
      </div>
      <Form.Item label="署名链接">
        <Input
          v-model:value="form.tileAttributionUrl"
          aria-label="署名链接"
          :maxlength="500"
          placeholder="HTTPS 链接（选填）"
        />
      </Form.Item>
    </div>
    <div class="flex justify-end">
      <Button type="primary" html-type="submit" :loading="saving">保存</Button>
    </div>
  </Form>
</template>
