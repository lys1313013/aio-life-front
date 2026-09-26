<script setup lang="ts">
import type { FormInstance } from 'ant-design-vue';

import type {
  BankCard,
  BankCardInput,
  BankOption,
  CardTag,
} from '#/api/bank-card';

import { computed, ref, watch } from 'vue';

import { DownOutlined } from '@ant-design/icons-vue';
import {
  AutoComplete,
  Button,
  DatePicker,
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Textarea,
} from 'ant-design-vue';

import { saveCard, saveTag } from '#/api/bank-card';

import CardFace from './card-face.vue';
import CoverPicker from './cover-picker.vue';
import { COLORS, defaultColor, STATUS_OPTIONS } from './model';

const props = defineProps<{
  banks: BankOption[];
  card?: BankCard;
  open: boolean;
  tags: CardTag[];
}>();
const emit = defineEmits<{
  saved: [card: BankCard];
  tagCreated: [tag: CardTag];
  'update:open': [value: boolean];
}>();
const formRef = ref<FormInstance>();
const saving = ref(false);
const uploading = ref(false);
const expanded = ref(false);
function empty(): BankCardInput {
  return {
    bankId: null,
    customBankName: null,
    cardType: 'debit',
    status: 'normal',
    cardNo: '',
    cardName: null,
    alias: null,
    branchName: null,
    openedDate: null,
    expiryMonth: null,
    creditLimit: null,
    statementDay: null,
    repaymentDay: null,
    coverColor: null,
    coverSourceUrl: null,
    sortOrder: 0,
    remark: null,
    tagIds: [],
    coverFileIds: [],
  };
}
const form = ref(empty());
const bankText = ref('');
const bank = computed(() =>
  props.banks.find((b) => b.id === form.value.bankId),
);
const bankOptions = computed(() =>
  props.banks
    .filter((b) =>
      b.name
        .toLocaleLowerCase()
        .includes(bankText.value.trim().toLocaleLowerCase()),
    )
    .map((b) => ({
      value: b.name,
      bankId: b.id,
      label: b.name + (b.enabled ? '' : '（已停用）'),
      disabled: !b.enabled && b.id !== props.card?.bankId,
    })),
);
function changeBankName(value: unknown) {
  const name = String(value ?? '');
  if (bank.value?.name !== name) {
    form.value.bankId = null;
    form.value.customBankName = name.trim() || null;
  }
}
function selectBank(_value: unknown, option: unknown) {
  form.value.bankId = (option as { bankId: string }).bankId;
  form.value.customBankName = null;
}
const tagOptions = computed(() =>
  props.tags.map((tag) => ({
    value: tag.id,
    label: tag.name,
    disabled:
      tag.status !== '0' && !props.card?.tags.some((t) => t.id === tag.id),
  })),
);
watch(
  () => props.open,
  (open) => {
    if (!open) {
      form.value.cardNo = '';
      return;
    }
    form.value = props.card
      ? {
          ...empty(),
          ...props.card,
          cardNo: '',
          tagIds: props.card.tags.map((t) => t.id),
          coverFileIds: [...props.card.coverFileIds],
        }
      : empty();
    bankText.value = props.card?.bankName ?? '';
    expanded.value = false;
    formRef.value?.clearValidate();
  },
);
function changeType(type: unknown) {
  if (type === 'debit') {
    if (
      form.value.creditLimit !== null ||
      form.value.statementDay !== null ||
      form.value.repaymentDay !== null
    )
      message.info('信用卡字段已清空，保存后生效');
    form.value.creditLimit = null;
    form.value.statementDay = null;
    form.value.repaymentDay = null;
  }
}
function coverChange(id?: string) {
  form.value.coverFileIds = id ? [id] : [];
  form.value.coverSourceUrl = null;
}
async function submit() {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }
  if (!props.card && !form.value.cardNo?.trim()) {
    message.error('请输入卡号');
    return;
  }
  saving.value = true;
  try {
    const ids: string[] = [];
    for (const value of form.value.tagIds) {
      const existing = props.tags.find(
        (tag) => tag.id === value || tag.name === value.trim(),
      );
      if (existing) ids.push(existing.id);
      else {
        const tag = await saveTag({
          name: value.trim(),
          color: null,
          status: '0',
        });
        emit('tagCreated', tag);
        ids.push(tag.id);
      }
    }
    form.value.tagIds = [...new Set(ids)];
    // 请求白名单：不提交展示字段或服务端的用户/审计信息。
    const data = Object.fromEntries(
      Object.keys(empty()).map((key) => [
        key,
        form.value[key as keyof BankCardInput],
      ]),
    ) as BankCardInput;
    const saved = await saveCard(data, props.card?.id);
    emit('saved', saved);
    emit('update:open', false);
  } finally {
    saving.value = false;
  }
}
</script>
<template>
  <Modal
    :open="open"
    :title="card ? '编辑银行卡' : '添加银行卡'"
    centered
    :width="760"
    :confirm-loading="saving"
    :ok-button-props="{ disabled: uploading }"
    :cancel-button-props="{ disabled: saving || uploading }"
    :closable="!saving && !uploading"
    :keyboard="!saving && !uploading"
    :mask-closable="false"
    @cancel="emit('update:open', false)"
    @ok="submit"
  >
    <div class="editor-layout">
      <div class="editor-preview">
        <CardFace
          :bank-name="bank?.name || form.customBankName || undefined"
          :bank-code="bank?.code"
          :card-name="form.cardName"
          :card-type="form.cardType"
          :color="form.coverColor"
          :file-id="form.coverFileIds[0]"
        />
        <CoverPicker
          :file-id="form.coverFileIds[0]"
          @change="coverChange"
          @busy="uploading = $event"
        />
        <div v-if="form.coverFileIds.length === 0" class="color-options">
          <button
            v-for="color in COLORS"
            :key="color"
            type="button"
            :style="{ backgroundColor: color }"
            :class="{
              selected: (form.coverColor || defaultColor(bank?.code)) === color,
            }"
            :aria-label="`卡面颜色 ${color}`"
            :aria-pressed="form.coverColor === color"
            @click="form.coverColor = color"
          ></button>
        </div>
      </div>
      <Form
        ref="formRef"
        :model="form"
        layout="vertical"
        class="editor-form"
        :disabled="saving || uploading"
      >
        <FormItem
          label="银行"
          name="bankId"
          :rules="[
            {
              validator: async () => {
                if (!form.bankId && !form.customBankName?.trim())
                  throw new Error('请选择银行或填写银行名称');
              },
            },
          ]"
        >
          <AutoComplete
            v-model:value="bankText"
            :options="bankOptions"
            @change="changeBankName"
            @select="selectBank"
          >
            <Input
              :maxlength="100"
              placeholder="选择或输入银行名称"
              aria-label="银行名称"
            />
          </AutoComplete>
        </FormItem>
        <div class="form-columns">
          <FormItem label="类型">
            <Select
              v-model:value="form.cardType"
              :options="[
                { value: 'debit', label: '储蓄卡' },
                { value: 'credit', label: '信用卡' },
              ]"
              @change="changeType"
            />
          </FormItem>
          <FormItem label="状态">
            <Select v-model:value="form.status" :options="STATUS_OPTIONS" />
          </FormItem>
        </div>
        <FormItem
          label="卡号"
          name="cardNo"
          :rules="[
            {
              validator: async (_rule: unknown, value: string) => {
                if (!value && card) return;
                if (!/^[0-9]{12,19}$/.test((value || '').replace(/[\s-]/g, '')))
                  throw new Error('请输入12至19位卡号');
              },
            },
          ]"
        >
          <Input
            v-model:value="form.cardNo"
            autocomplete="off"
            inputmode="numeric"
            :maxlength="32"
            :placeholder="
              card ? `留空保留原卡号 · ${card.cardNoLast4}` : '输入完整卡号'
            "
          />
        </FormItem>
        <div class="form-columns">
          <FormItem label="别名">
            <Input
              :value="form.alias ?? undefined"
              @update:value="form.alias = $event ?? null"
              :maxlength="50"
              placeholder="如：日常用卡"
            />
          </FormItem>
          <FormItem label="卡片名称">
            <Input
              :value="form.cardName ?? undefined"
              @update:value="form.cardName = $event ?? null"
              :maxlength="100"
              placeholder="如：一卡通"
            />
          </FormItem>
        </div>
        <FormItem label="标签">
          <Select
            v-model:value="form.tagIds"
            mode="tags"
            :options="tagOptions"
            :max-tag-count="3"
            :token-separators="[',', '，']"
            placeholder="选择或输入新标签"
            option-filter-prop="label"
          />
        </FormItem>
        <div v-if="form.cardType === 'credit'" class="credit-fields">
          <FormItem label="信用额度（元）">
            <InputNumber
              :value="form.creditLimit ?? undefined"
              @update:value="form.creditLimit = $event ?? null"
              string-mode
              :min="0"
              :precision="2"
              placeholder="未记录"
              style="width: 100%"
            />
          </FormItem>
          <div class="form-columns">
            <FormItem label="账单日">
              <InputNumber
                :value="form.statementDay ?? undefined"
                @update:value="
                  form.statementDay = $event == null ? null : Number($event)
                "
                :min="1"
                :max="31"
                :precision="0"
                placeholder="每月几号"
                style="width: 100%"
              />
            </FormItem>
            <FormItem label="固定还款日">
              <InputNumber
                :value="form.repaymentDay ?? undefined"
                @update:value="
                  form.repaymentDay = $event == null ? null : Number($event)
                "
                :min="1"
                :max="31"
                :precision="0"
                placeholder="每月几号"
                style="width: 100%"
              />
            </FormItem>
          </div>
        </div>
        <Button
          type="text"
          size="small"
          class="more-toggle"
          :aria-expanded="expanded"
          @click="expanded = !expanded"
        >
          更多信息<DownOutlined :class="{ rotated: expanded }" />
        </Button>
        <div v-if="expanded" class="more-fields">
          <FormItem label="开户支行">
            <Input
              :value="form.branchName ?? undefined"
              @update:value="form.branchName = $event ?? null"
              :maxlength="200"
            />
          </FormItem>
          <div class="form-columns">
            <FormItem label="开卡日期">
              <DatePicker
                :value="form.openedDate ?? undefined"
                @update:value="form.openedDate = $event ? String($event) : null"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </FormItem>
            <FormItem label="有效期">
              <DatePicker
                :value="form.expiryMonth ?? undefined"
                @update:value="
                  form.expiryMonth = $event ? String($event) : null
                "
                picker="month"
                value-format="YYYY-MM-01"
                style="width: 100%"
              />
            </FormItem>
          </div>
          <FormItem v-if="form.coverFileIds.length > 0" label="卡面出处">
            <Input
              :value="form.coverSourceUrl ?? undefined"
              @update:value="form.coverSourceUrl = $event ?? null"
              :maxlength="1000"
              placeholder="官方产品页地址（可选）"
            />
          </FormItem>
          <FormItem label="排序">
            <InputNumber
              v-model:value="form.sortOrder"
              :min="0"
              :max="2147483647"
              :precision="0"
            />
          </FormItem>
          <FormItem label="备注">
            <Textarea
              :value="form.remark ?? undefined"
              @update:value="form.remark = $event ?? null"
              :maxlength="1000"
              :auto-size="{ minRows: 2, maxRows: 4 }"
            />
          </FormItem>
        </div>
      </Form>
    </div>
  </Modal>
</template>
<style scoped>
.editor-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 28px;
  padding-top: 12px;
  max-height: 70vh;
  overflow-y: auto;
}
.editor-preview {
  align-self: start;
  position: sticky;
  top: 0;
}
.editor-preview :deep(.card-face) {
  padding: 18px;
}
.editor-preview :deep(.face-bank) {
  font-size: 14px;
}
.editor-form {
  min-width: 0;
  padding-right: 3px;
}
.editor-form :deep(.ant-form-item) {
  margin-bottom: 16px;
}
.form-columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
}
.color-options {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 18px;
}
.color-options button {
  width: 25px;
  height: 25px;
  border-radius: 50%;
  border: 3px solid hsl(var(--background));
  outline: 1px solid transparent;
  cursor: pointer;
}
.color-options button.selected {
  outline-color: hsl(var(--foreground) / 0.45);
}
.more-toggle {
  padding-left: 0;
  color: hsl(var(--muted-foreground));
}
.more-toggle .rotated {
  transform: rotate(180deg);
}
.more-fields {
  padding-top: 15px;
}
@media (max-width: 680px) {
  .editor-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 22px;
  }
  .editor-preview {
    width: 100%;
    max-width: 320px;
    margin: auto;
    position: static;
  }
}
</style>
