<script setup lang="ts">
import { onDeactivated, onUnmounted, ref, watch } from 'vue';

import {
  Button as AButton,
  Col as ACol,
  DatePicker as ADatePicker,
  Form as AForm,
  Input as AInput,
  InputNumber as AInputNumber,
  Row as ARow,
  Select as ASelect,
  Spin as ASpin,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import { getByDictType } from '#/api/core/common';
import {
  add,
  deleteData,
  getDevice,
  update,
  uploadImage,
} from '#/api/core/device';
import { getByDictType as getUserDictType } from '#/api/core/userDictType';
import { AppModal, AppModalDelete } from '#/components/app-modal';
import ImageUpload from '#/components/ImageUpload.vue';

const props = defineProps<{
  deviceId?: string;
  initialType?: string;
  record?: any;
}>();
const emit = defineEmits<{ deleted: [id: string]; saved: [] }>();
const AFormItem = AForm.Item;
const ATextarea = AInput.TextArea;
const open = defineModel<boolean>('open', { default: false });
const newDevice = ref<any>({});
const typeOptions = ref<any[]>([]);
const statusOptions = ref<any[]>([]);
const loading = ref(false);
const failed = ref(false);
const saving = ref(false);
const deleting = ref(false);
let version = 0;
async function load() {
  const current = ++version;
  newDevice.value = {};
  failed.value = false;
  loading.value = false;
  if (!open.value) return;
  loading.value = true;
  try {
    const [types, statuses, record] = await Promise.all([
      getUserDictType('device_type'),
      getByDictType('device_status'),
      props.deviceId
        ? getDevice(props.deviceId)
        : Promise.resolve(props.record),
    ]);
    if (current !== version || !open.value) return;
    if (props.deviceId && (!record || record.id !== props.deviceId))
      throw new Error('记录不存在或已删除');
    typeOptions.value = (types?.dictDetailList || []).map((item: any) => ({
      ...item,
      label: item.dictLabel || item.label,
      value: String(item.id),
    }));
    statusOptions.value = statuses?.dictDetailList || [];
    newDevice.value = record
      ? {
          ...record,
          purchaseDate: record.purchaseDate ? dayjs(record.purchaseDate) : null,
          endDate: record.endDate ? dayjs(record.endDate) : null,
        }
      : {
          name: '',
          spec: '',
          purchasePrice: null,
          purchaseDate: dayjs(),
          status: '1',
          fileId: null,
          purchasePlace: '',
          endDate: null,
          remark: '',
          type: props.initialType || '',
        };
  } catch {
    if (current === version) failed.value = true;
  } finally {
    if (current === version) loading.value = false;
  }
}
async function save() {
  if (loading.value || failed.value || saving.value || deleting.value) return;
  const current = version;
  const payload = {
    ...newDevice.value,
    purchaseDate: newDevice.value.purchaseDate?.format('YYYY-MM-DD') || null,
    endDate: newDevice.value.endDate?.format('YYYY-MM-DD') || null,
  };
  saving.value = true;
  try {
    if (payload.id) await update(payload.id, payload);
    else await add(payload);
    if (current !== version) return;
    emit('saved');
    open.value = false;
  } finally {
    saving.value = false;
  }
}
async function remove() {
  if (!newDevice.value.id || saving.value || deleting.value) return;
  const current = version;
  const id = newDevice.value.id;
  deleting.value = true;
  try {
    await deleteData(id);
    if (current !== version) return;
    emit('deleted', id);
    open.value = false;
  } finally {
    deleting.value = false;
  }
}
watch(() => [open.value, props.deviceId, props.record], load, {
  immediate: true,
});
onDeactivated(() => {
  version++;
  open.value = false;
});
onUnmounted(() => {
  version++;
});
</script>
<template>
  <AppModal
    v-model:open="open"
    :title="deviceId || record?.id ? '编辑设备' : '新增设备'"
    :confirm-loading="saving"
    :busy="deleting"
    :ok-button-props="{ disabled: loading || failed }"
    :closable="false"
    centered
    @ok="save"
  >
    <template #footer-leading>
      <AppModalDelete
        v-if="newDevice.id && !loading && !failed"
        :action="remove"
        :disabled="saving"
        :loading="deleting"
        title="确定要删除这个设备吗？"
      />
    </template>
    <div
      v-if="loading || failed"
      class="flex min-h-32 items-center justify-center"
    >
      <ASpin v-if="loading" aria-label="加载中" />
      <AButton v-else @click="load">重新加载详情</AButton>
    </div>
    <AForm v-else :model="newDevice" layout="vertical" class="device-form">
      <AFormItem label="设备名称">
        <AInput v-model:value="newDevice.name" />
      </AFormItem>
      <AFormItem label="配置">
        <AInput v-model:value="newDevice.spec" placeholder="" />
      </AFormItem>
      <ARow :gutter="16">
        <ACol :xs="24" :sm="12">
          <AFormItem label="设备类型">
            <ASelect
              v-model:value="newDevice.type"
              style="width: 100%"
              :options="typeOptions"
            />
          </AFormItem>
        </ACol>
        <ACol :xs="24" :sm="12">
          <AFormItem label="设备状态">
            <ASelect
              v-model:value="newDevice.status"
              style="width: 100%"
              :options="statusOptions"
            />
          </AFormItem>
        </ACol>
      </ARow>
      <ARow :gutter="16">
        <ACol :xs="24" :sm="12">
          <AFormItem label="价格">
            <AInputNumber
              v-model:value="newDevice.purchasePrice"
              style="width: 100%"
            />
          </AFormItem>
        </ACol>
        <ACol :xs="24" :sm="12">
          <AFormItem label="购买平台">
            <AInput v-model:value="newDevice.purchasePlace" />
          </AFormItem>
        </ACol>
      </ARow>
      <ARow :gutter="16">
        <ACol :xs="24" :sm="12">
          <AFormItem label="购买日期">
            <ADatePicker
              format="YYYY-MM-DD"
              v-model:value="newDevice.purchaseDate"
              style="width: 100%"
            />
          </AFormItem>
        </ACol>
        <ACol :xs="24" :sm="12">
          <AFormItem label="退役日期">
            <ADatePicker
              format="YYYY-MM-DD"
              v-model:value="newDevice.endDate"
              style="width: 100%"
              placeholder="留空则计算至今日"
            />
          </AFormItem>
        </ACol>
      </ARow>
      <AFormItem label="设备图片">
        <ImageUpload
          v-model:file-id="newDevice.fileId"
          :upload-fn="uploadImage"
        />
      </AFormItem>
      <AFormItem label="备注">
        <ATextarea
          v-model:value="newDevice.remark"
          :rows="3"
          placeholder="其他备注信息"
        />
      </AFormItem>
    </AForm>
  </AppModal>
</template>
<style scoped>
.device-form :deep(.ant-form-item) {
  margin-bottom: 12px;
}
</style>
