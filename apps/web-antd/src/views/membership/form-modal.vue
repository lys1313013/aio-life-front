<script setup lang="ts">
import type { FormInstance } from 'ant-design-vue';
import type { Rule } from 'ant-design-vue/es/form';

import type { MembershipReq, MembershipVO } from '#/api/membership';
import type { MembershipProviderVO } from '#/api/membership/providers';

import { computed, nextTick, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';
import { usePreferences } from '@vben/preferences';

import {
  Button as AButton,
  DatePicker as ADatePicker,
  Form as AForm,
  FormItem as AFormItem,
  Input as AInput,
  InputNumber as AInputNumber,
  Select as ASelect,
  SelectOption as ASelectOption,
  Switch as ASwitch,
  Textarea as ATextarea,
  message,
} from 'ant-design-vue';
import dayjs, { Dayjs } from 'dayjs';

import {
  createMembership,
  deleteMembership,
  updateMembership,
} from '#/api/membership';
import { queryMembershipProviders } from '#/api/membership/providers';
import { AppModal as AModal, AppModalDelete } from '#/components/app-modal';

import {
  BILLING_CYCLES,
  CATEGORIES,
  COLOR_PRESETS,
  QUICK_DATES,
} from './constants';
import MembershipLogo from './MembershipLogo.vue';

const props = defineProps<{ values?: MembershipVO }>();
const emit = defineEmits<{
  deleted: [id: string];
  saved: [record: MembershipVO];
}>();
const modalVisible = defineModel<boolean>('open', { default: false });
const { isMobile } = usePreferences();
const formRef = ref<FormInstance>();
const submitLoading = ref(false);
const providers = ref<MembershipProviderVO[]>([]);
const providersLoading = ref(false);
const providersFailed = ref(false);
let providerRequest = 0;
let autoName = '';

async function loadProviders() {
  const request = ++providerRequest;
  providersLoading.value = true;
  providersFailed.value = false;
  try {
    const result = await queryMembershipProviders();
    if (request === providerRequest) providers.value = result;
  } catch {
    if (request === providerRequest) providersFailed.value = true;
  } finally {
    if (request === providerRequest) providersLoading.value = false;
  }
}
const providerOptions = computed(() => {
  const options = providers.value
    .filter(
      (provider) =>
        !formState.value.category ||
        provider.category === formState.value.category,
    )
    .map((provider) => ({ ...provider, disabled: false }));
  const existing = props.values;
  if (
    existing?.providerId &&
    existing.providerId === formState.value.providerId &&
    existing.category === formState.value.category &&
    !options.some((provider) => provider.id === existing.providerId)
  ) {
    options.unshift({
      id: existing.providerId,
      name: existing.providerName || existing.provider || '原平台',
      code: '',
      category: existing.category || 'other',
      iconKey: existing.providerIconKey,
      sortOrder: 0,
      isEnabled: 0,
      disabled: true,
    });
  }
  return options;
});
function changeProvider(value: unknown) {
  const provider = providers.value.find((item) => item.id === value);
  if (provider) {
    if (!formState.value.name.trim() || formState.value.name === autoName) {
      formState.value.name = provider.name;
      autoName = provider.name;
      formRef.value?.clearValidate('name');
    }
    formState.value.category = provider.category;
    formState.value.provider = provider.name;
  }
}
function changeCategory(value: unknown) {
  const selected = providers.value.find(
    (provider) => provider.id === formState.value.providerId,
  );
  const original = props.values;
  const selectedCategory =
    selected?.category ||
    (original?.providerId === formState.value.providerId
      ? original?.category
      : undefined);
  if (
    formState.value.providerId &&
    selectedCategory &&
    selectedCategory !== value
  ) {
    formState.value.providerId = undefined;
    formState.value.provider = '';
    if (formState.value.name === autoName) formState.value.name = '';
    autoName = '';
  }
}

interface FormState {
  id?: string;
  name: string;
  category?: string;
  provider?: string;
  providerId?: string;
  color?: string;
  startDate?: Dayjs;
  expiryDate?: Dayjs;
  price?: number;
  billingCycle: string;
  monthlyAmount?: number;
  autoRenew: boolean;
  note?: string;
}

const emptyForm = (): FormState => ({
  name: '',
  category: undefined,
  provider: '',
  providerId: undefined,
  color: COLOR_PRESETS[0],
  startDate: undefined,
  expiryDate: undefined,
  price: undefined,
  billingCycle: 'month',
  monthlyAmount: undefined,
  autoRenew: false,
  note: '',
});

const formState = ref<FormState>(emptyForm());

const rules: Record<string, Rule[]> = {
  name: [{ required: true, message: '请输入会员名称', trigger: 'blur' }],
  expiryDate: [
    { required: true, message: '请选择到期日期', trigger: 'change' },
  ],
};

watch(
  modalVisible,
  async (open) => {
    if (!open) {
      providerRequest++;
      return;
    }
    void loadProviders();
    const item = props.values;
    const providerName = item?.providerName || item?.provider || '';
    autoName =
      item?.providerId && item.name === providerName ? providerName : '';
    if (item) {
      formState.value = {
        id: item.id,
        name: item.name,
        category: item.category,
        provider: item.provider || '',
        providerId: item.providerId || undefined,
        color: item.color || COLOR_PRESETS[0],
        startDate: item.startDate ? dayjs(item.startDate) : undefined,
        expiryDate: item.expiryDate ? dayjs(item.expiryDate) : undefined,
        price: item.price,
        billingCycle: item.billingCycle || 'month',
        monthlyAmount: item.monthlyAmount ?? item.price,
        autoRenew: item.autoRenew === 1,
        note: item.note || '',
      };
    } else {
      formState.value = emptyForm();
    }
    await nextTick();
    formRef.value?.clearValidate();
  },
  { immediate: true },
);

const handleDelete = async (id: string) => {
  await deleteMembership(id);
  modalVisible.value = false;
  message.success('删除成功');
  emit('deleted', id);
};

const handleSave = async () => {
  if (!formRef.value || submitLoading.value) return;
  submitLoading.value = true;
  try {
    await formRef.value.validate();

    const payload: MembershipReq = {
      id: formState.value.id,
      name: formState.value.name,
      category: formState.value.category || 'other',
      provider: formState.value.provider || undefined,
      providerId: formState.value.providerId || null,
      color: formState.value.color,
      startDate: formState.value.startDate?.format('YYYY-MM-DD'),
      expiryDate: formState.value.expiryDate!.format('YYYY-MM-DD'),
      price: formState.value.price,
      billingCycle: formState.value.billingCycle,
      monthlyAmount: formState.value.monthlyAmount,
      autoRenew: formState.value.autoRenew ? 1 : 0,
      note: formState.value.note || undefined,
    };

    const saved = formState.value.id
      ? await updateMembership(payload)
      : await createMembership(payload);

    modalVisible.value = false;
    emit('saved', saved);
  } catch (error) {
    console.error('Validate Failed:', error);
  } finally {
    submitLoading.value = false;
  }
};

const applyQuickDate = (opt: { getDate: (base: Dayjs) => Dayjs }) => {
  const base = formState.value.startDate || dayjs();
  formState.value.expiryDate = opt.getDate(base);
};

const recalculateMonthlyAmount = () => {
  const price = formState.value.price;
  if (price === undefined || price === null) {
    formState.value.monthlyAmount = undefined;
    return;
  }

  const amount = (() => {
    switch (formState.value.billingCycle) {
      case 'half_year': {
        return price / 6;
      }
      case 'quarter': {
        return price / 3;
      }
      case 'two_weeks': {
        return (price / 14) * 30;
      }
      case 'week': {
        return (price / 7) * 30;
      }
      case 'year': {
        return price / 12;
      }
      default: {
        return price;
      }
    }
  })();

  formState.value.monthlyAmount = Math.round(amount * 100) / 100;
};
</script>

<template>
  <AModal
    v-model:open="modalVisible"
    :confirm-loading="submitLoading"
    :width="isMobile ? '92vw' : 600"
    :centered="true"
    :closable="false"
    @ok="handleSave"
  >
    <template #footer-leading>
      <AppModalDelete
        v-if="formState.id"
        :disabled="submitLoading"
        title="确定删除该会员吗？"
        :action="() => handleDelete(formState.id!)"
      />
    </template>
    <AForm ref="formRef" :model="formState" :rules="rules" layout="vertical">
      <AFormItem label="名称" name="name">
        <AInput
          v-model:value="formState.name"
          placeholder="请输入会员名称"
          allow-clear
        />
      </AFormItem>

      <div class="flex flex-col sm:flex-row sm:gap-4">
        <AFormItem label="分类" name="category" class="flex-1">
          <ASelect
            v-model:value="formState.category"
            placeholder="请选择分类"
            @change="changeCategory"
          >
            <ASelectOption
              v-for="cat in CATEGORIES"
              :key="cat.value"
              :value="cat.value"
            >
              <span class="inline-flex items-center gap-1">
                <IconifyIcon :icon="cat.icon" />
                {{ cat.label }}
              </span>
            </ASelectOption>
          </ASelect>
        </AFormItem>

        <AFormItem label="平台" name="providerId" class="min-w-0 flex-1">
          <ASelect
            v-model:value="formState.providerId"
            :loading="providersLoading"
            :disabled="providersLoading || providersFailed"
            placeholder="选择平台"
            show-search
            option-filter-prop="label"
            allow-clear
            @change="changeProvider"
          >
            <ASelectOption
              v-for="provider in providerOptions"
              :key="provider.id"
              :value="provider.id"
              :label="provider.name"
              :disabled="provider.disabled"
            >
              <span class="inline-flex items-center gap-2">
                <MembershipLogo
                  :icon-key="provider.iconKey"
                  :category="provider.category"
                  :name="provider.name"
                  class="!h-5 !w-5"
                />
                {{ provider.name }}
              </span>
            </ASelectOption>
          </ASelect>
          <div
            v-if="providersFailed"
            class="mt-1 flex items-center gap-1 text-sm text-destructive"
            role="alert"
          >
            平台加载失败
            <AButton
              type="link"
              size="small"
              :loading="providersLoading"
              @click="loadProviders"
            >
              重试
            </AButton>
          </div>
        </AFormItem>
      </div>

      <AFormItem
        v-if="!formState.providerId"
        label="自定义平台/服务商"
        name="provider"
      >
        <AInput
          v-model:value="formState.provider"
          placeholder="未收录的平台，可直接填写"
          :maxlength="100"
          allow-clear
        />
      </AFormItem>

      <div class="flex flex-col sm:flex-row sm:gap-4">
        <AFormItem label="开通日期" name="startDate" class="flex-1">
          <ADatePicker
            v-model:value="formState.startDate"
            class="w-full"
            placeholder="选择日期"
          />
        </AFormItem>

        <AFormItem label="到期日期" name="expiryDate" class="flex-1">
          <ADatePicker
            v-model:value="formState.expiryDate"
            class="w-full"
            placeholder="选择日期"
          />
        </AFormItem>
      </div>

      <div class="mb-3 flex flex-wrap items-center gap-1.5 sm:mb-4">
        <span class="mr-1 text-xs text-muted-foreground">从开通日算起：</span>
        <button
          v-for="opt in QUICK_DATES"
          :key="opt.label"
          type="button"
          class="cursor-pointer rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground transition-colors hover:bg-primary/10 hover:text-primary"
          @click="applyQuickDate(opt)"
        >
          {{ opt.label }}
        </button>
      </div>

      <div class="flex flex-col sm:flex-row sm:gap-4">
        <AFormItem label="支付金额" name="price" class="flex-1">
          <AInputNumber
            v-model:value="formState.price"
            class="w-full"
            :min="0"
            :precision="2"
            placeholder="￥"
            @change="recalculateMonthlyAmount()"
          />
        </AFormItem>

        <AFormItem label="计费周期" name="billingCycle" class="flex-1">
          <ASelect
            v-model:value="formState.billingCycle"
            @change="recalculateMonthlyAmount()"
          >
            <ASelectOption
              v-for="cycle in BILLING_CYCLES"
              :key="cycle.value"
              :value="cycle.value"
            >
              {{ cycle.label }}
            </ASelectOption>
          </ASelect>
        </AFormItem>
      </div>

      <AFormItem label="每月金额" name="monthlyAmount">
        <AInputNumber
          v-model:value="formState.monthlyAmount"
          class="w-full"
          :min="0"
          :precision="2"
          placeholder="选择周期后自动计算，也可以手动修改"
        />
      </AFormItem>

      <AFormItem label="颜色" name="color">
        <div class="flex flex-wrap gap-2">
          <span
            v-for="c in COLOR_PRESETS"
            :key="c"
            class="h-6 w-6 cursor-pointer rounded-full border-2 transition-transform hover:scale-110"
            :class="
              formState.color === c ? 'border-black/40' : 'border-transparent'
            "
            :style="{ background: c }"
            @click="formState.color = c"
          ></span>
        </div>
      </AFormItem>

      <AFormItem label="自动续费" name="autoRenew">
        <div class="flex items-center gap-2">
          <ASwitch v-model:checked="formState.autoRenew" />
          <span class="text-sm text-muted-foreground">
            {{
              formState.autoRenew ? '到期后自动扣费续期' : '到期后需要手动续费'
            }}
          </span>
        </div>
      </AFormItem>

      <AFormItem label="备注" name="note">
        <ATextarea
          v-model:value="formState.note"
          :rows="2"
          placeholder="备注..."
          allow-clear
        />
      </AFormItem>
    </AForm>
  </AModal>
</template>

<style scoped>
@media (max-width: 767.98px) {
  :deep(.ant-form-item) {
    margin-bottom: 12px;
  }
}
</style>
