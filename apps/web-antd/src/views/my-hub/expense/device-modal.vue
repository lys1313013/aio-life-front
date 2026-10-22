<script setup lang="ts">
import type {
  ExpenseDeviceChange,
  LinkedDevice,
} from '#/api/core/expense-device';
import type { DeviceCreateReq } from '#/api/payload';

import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import { DisconnectOutlined } from '@ant-design/icons-vue';
import {
  Button,
  DatePicker,
  Form,
  FormItem,
  Input,
  InputNumber,
  Popconfirm,
  RadioButton,
  RadioGroup,
  Select,
  Spin,
} from 'ant-design-vue';

import { query as queryDevices } from '#/api/core/device';
import {
  bindExpenseDevice,
  createExpenseDevice,
  getExpenseDevice,
  unbindExpenseDevice,
} from '#/api/core/expense-device';
import { getByDictType } from '#/api/core/userDictType';
import { AppModal } from '#/components/app-modal';

const props = defineProps<{ expenseId: string }>();
const emit = defineEmits<{
  close: [];
  updated: [change: ExpenseDeviceChange];
}>();
const mode = ref('existing');
const current = ref<LinkedDevice | null>(null);
type DeviceDraft = {
  [K in keyof DeviceCreateReq]: Exclude<DeviceCreateReq[K], null>;
};
const draft = ref<DeviceDraft>({});
const selectedId = ref<string>();
const failed = ref(false);
const loading = ref(false);
const ready = ref(false);
const saving = ref(false);
const formError = ref('');
const types = ref<{ label: string; value: string }[]>([]);
const choices = ref<LinkedDevice[]>([]);
const choicesBusy = ref(false);
const choicesError = ref(false);
let alive = true;
let generation = 0;
let page = 0;
let total = 0;
let keyword = '';
let searchTimer: ReturnType<typeof setTimeout> | undefined;
onBeforeUnmount(() => {
  alive = false;
  generation++;
  clearTimeout(searchTimer);
});
const options = computed(() => {
  const rows = [...choices.value];
  if (current.value && !rows.some((row) => row.id === current.value?.id))
    rows.unshift(current.value);
  return rows.map((row) => ({
    value: row.id,
    label: [row.name, row.spec, row.purchaseDate].filter(Boolean).join(' · '),
  }));
});
async function loadChoices(reset = true) {
  if (
    !reset &&
    (choicesBusy.value || choices.value.length >= total || choicesError.value)
  )
    return;
  const next = reset ? 1 : page + 1;
  const stamp = ++generation;
  choicesBusy.value = true;
  choicesError.value = false;
  try {
    const result = await queryDevices({
      page: next,
      pageSize: 30,
      condition: { name: keyword },
    });
    if (!alive || stamp !== generation) return;
    choices.value = reset ? result.items : [...choices.value, ...result.items];
    total =
      result.items.length > 0
        ? (result.total ?? choices.value.length)
        : choices.value.length;
    page = next;
  } catch {
    if (alive && stamp === generation) choicesError.value = true;
  } finally {
    if (alive && stamp === generation) choicesBusy.value = false;
  }
}
function search(value: string) {
  keyword = value;
  generation++;
  choicesBusy.value = true;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    void loadChoices();
  }, 250);
}
function scroll(event: Event) {
  const element = event.target as HTMLElement;
  if (element.scrollTop + element.clientHeight >= element.scrollHeight - 24)
    void loadChoices(false);
}
async function initialize() {
  loading.value = true;
  failed.value = false;
  ready.value = false;
  try {
    const [context, dictionary] = await Promise.all([
      getExpenseDevice(props.expenseId),
      getByDictType('device_type'),
    ]);
    if (!alive) return;
    current.value = context.device;
    selectedId.value = context.device?.id;
    draft.value = Object.fromEntries(
      Object.entries(context.defaults).map(([key, value]) => [
        key,
        value ?? undefined,
      ]),
    );
    types.value = (dictionary.dictDetailList || []).map((item) => ({
      label: item.dictLabel || item.label || String(item.id),
      value: String(item.id),
    }));
    ready.value = true;
    void loadChoices();
  } catch {
    if (alive) failed.value = true;
  } finally {
    if (alive) loading.value = false;
  }
}
function publish(device: LinkedDevice | null) {
  emit('updated', {
    expenseId: props.expenseId,
    deviceId: device?.id ?? null,
    deviceName: device?.name ?? null,
  });
  emit('close');
}
async function save() {
  if (!ready.value || saving.value) return;
  formError.value = '';
  if (mode.value === 'existing' && !selectedId.value) {
    formError.value = '请选择设备';
    return;
  }
  if (mode.value === 'new' && !draft.value.name?.trim()) {
    formError.value = '请填写设备名称';
    return;
  }
  saving.value = true;
  try {
    const result =
      mode.value === 'new'
        ? await createExpenseDevice(props.expenseId, draft.value)
        : await bindExpenseDevice(props.expenseId, selectedId.value!);
    if (alive) publish(result);
  } catch {
    /* 请求客户端统一提示，保留已填写内容。 */
  } finally {
    if (alive) saving.value = false;
  }
}
async function unbind() {
  if (saving.value) return;
  saving.value = true;
  try {
    if ((await unbindExpenseDevice(props.expenseId)) && alive) publish(null);
  } catch {
    /* 请求客户端统一提示。 */
  } finally {
    if (alive) saving.value = false;
  }
}
onMounted(initialize);
</script>

<template>
  <AppModal
    :open="true"
    :width="520"
    :busy="saving"
    :confirm-loading="saving"
    :ok-button-props="{ disabled: !ready }"
    @cancel="emit('close')"
    @ok="save"
  >
    <Spin :spinning="loading">
      <div class="min-h-24">
        <Button v-if="failed" @click="initialize">重试</Button>
        <Form v-if="ready" layout="vertical" :disabled="saving">
          <FormItem label="关联设备">
            <RadioGroup v-model:value="mode">
              <RadioButton value="existing">已有设备</RadioButton>
              <RadioButton v-if="!current" value="new">新建设备</RadioButton>
            </RadioGroup>
          </FormItem>
          <template v-if="mode === 'existing'">
            <FormItem label="设备">
              <Select
                v-model:value="selectedId"
                aria-label="选择设备"
                show-search
                :filter-option="false"
                :options="options"
                :loading="choicesBusy"
                placeholder="搜索设备名称"
                @search="search"
                @popup-scroll="scroll"
              />
              <Button v-if="choicesError" type="link" @click="loadChoices()">
                重试
              </Button>
            </FormItem>
            <Popconfirm
              v-if="current"
              title="解除该支出与设备的关联？"
              @confirm="unbind"
            >
              <Button danger :loading="saving" aria-label="解除设备关联">
                <DisconnectOutlined />
              </Button>
            </Popconfirm>
          </template>
          <template v-else>
            <FormItem label="设备名称" required>
              <Input
                v-model:value="draft.name"
                aria-label="设备名称"
                :maxlength="255"
              />
            </FormItem>
            <FormItem label="配置">
              <Input
                v-model:value="draft.spec"
                aria-label="配置"
                :maxlength="255"
              />
            </FormItem>
            <FormItem label="设备类型">
              <Select
                v-model:value="draft.type"
                aria-label="设备类型"
                :options="types"
                allow-clear
              />
            </FormItem>
            <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              <FormItem label="购买价格">
                <InputNumber
                  v-model:value="draft.purchasePrice"
                  aria-label="购买价格"
                  class="w-full"
                  :min="0"
                  :max="99999999.99"
                  :precision="2"
                />
              </FormItem>
              <FormItem label="购买日期">
                <DatePicker
                  v-model:value="draft.purchaseDate"
                  aria-label="购买日期"
                  class="w-full"
                  value-format="YYYY-MM-DD"
                />
              </FormItem>
            </div>
            <FormItem label="购买地点">
              <Input
                v-model:value="draft.purchasePlace"
                aria-label="购买地点"
                :maxlength="255"
              />
            </FormItem>
            <FormItem label="备注">
              <Input.TextArea
                v-model:value="draft.remark"
                aria-label="备注"
                :maxlength="255"
                :rows="2"
              />
            </FormItem>
          </template>
          <p v-if="formError" role="alert" class="text-destructive">
            {{ formError }}
          </p>
        </Form>
      </div>
    </Spin>
  </AppModal>
</template>
