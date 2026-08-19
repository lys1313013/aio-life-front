<script setup lang="ts">
import type { Rule } from 'ant-design-vue/es/form';

import type {
  MembershipReq,
  MembershipStatsVO,
  MembershipVO,
} from '#/api/membership';

import { computed, onMounted, ref } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { CalendarOutlined, SearchOutlined } from '@ant-design/icons-vue';
import {
  Button as AButton,
  DatePicker as ADatePicker,
  Empty as AEmpty,
  Form as AForm,
  FormItem as AFormItem,
  Input as AInput,
  InputNumber as AInputNumber,
  Modal as AModal,
  Popconfirm as APopconfirm,
  Select as ASelect,
  SelectOption as ASelectOption,
  Spin as ASpin,
  Switch as ASwitch,
  Tag as ATag,
  Textarea as ATextarea,
  message,
} from 'ant-design-vue';
import dayjs, { Dayjs } from 'dayjs';

import {
  createMembership,
  deleteMembership,
  getMembershipStats,
  queryMemberships,
  updateMembership,
} from '#/api/membership';
import GlobalFloatBtn from '#/components/global-float-btn/index.vue';

interface FormState {
  id?: string;
  name: string;
  category?: string;
  provider?: string;
  color?: string;
  startDate?: Dayjs;
  expiryDate?: Dayjs;
  price?: number;
  billingCycle: string;
  monthlyAmount?: number;
  autoRenew: boolean;
  note?: string;
}

// 分类预设
const CATEGORIES = [
  { value: 'video', label: '视频', icon: 'mdi:movie-open-outline' },
  { value: 'music', label: '音乐', icon: 'mdi:music-note-eighth' },
  { value: 'shopping', label: '购物', icon: 'mdi:shopping-outline' },
  { value: 'cloud', label: '云盘', icon: 'mdi:cloud-outline' },
  { value: 'study', label: '学习', icon: 'mdi:book-open-outline' },
  { value: 'game', label: '游戏', icon: 'mdi:gamepad-variant-outline' },
  { value: 'other', label: '其他', icon: 'mdi:shape-outline' },
];

const COLOR_PRESETS = [
  '#1677ff',
  '#52c41a',
  '#faad14',
  '#f5222d',
  '#722ed1',
  '#13c2c2',
  '#eb2f96',
  '#8c8c8c',
];

// 到期日期快捷选项（基于开通日期计算，未填开通日期则基于今天）
const QUICK_DATES = [
  { label: '1月', getDate: (base: Dayjs) => base.add(1, 'month') },
  { label: '1季度', getDate: (base: Dayjs) => base.add(3, 'month') },
  { label: '半年', getDate: (base: Dayjs) => base.add(6, 'month') },
  { label: '1年', getDate: (base: Dayjs) => base.add(1, 'year') },
];

const BILLING_CYCLES = [
  { value: 'week', label: '一周' },
  { value: 'two_weeks', label: '两周' },
  { value: 'month', label: '一个月' },
  { value: 'quarter', label: '一季度' },
  { value: 'half_year', label: '半年' },
  { value: 'year', label: '一年' },
];

const STATUS_META: Record<string, { color: string; label: string }> = {
  active: { label: '生效中', color: 'success' },
  expiring: { label: '即将到期', color: 'warning' },
  expired: { label: '已过期', color: 'default' },
};

// Data
const members = ref<MembershipVO[]>([]);
const stats = ref<MembershipStatsVO>({
  activeCount: 0,
  expiringCount: 0,
  expiredCount: 0,
  expiringThisMonthCount: 0,
  monthlyAmount: 0,
});
const loading = ref(false);
const statsLoading = ref(false);

// Filters
const filters = ref({
  keyword: '',
  category: undefined as string | undefined,
});

// Modal & Form
const modalVisible = ref(false);
const formRef = ref();
const modalTitle = ref('添加会员');
const submitLoading = ref(false);

const emptyForm = (): FormState => ({
  name: '',
  category: undefined,
  provider: '',
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

// Computed
const filteredMembers = computed(() => {
  return members.value
    .filter((item) => {
      if (filters.value.keyword) {
        const kw = filters.value.keyword.toLowerCase();
        const matchName = item.name.toLowerCase().includes(kw);
        const matchProvider = (item.provider || '').toLowerCase().includes(kw);
        if (!matchName && !matchProvider) return false;
      }
      if (filters.value.category && item.category !== filters.value.category)
        return false;
      return true;
    })
    .toSorted((a, b) => {
      const rankA = a.status === 'expired' ? 1 : 0;
      const rankB = b.status === 'expired' ? 1 : 0;
      if (rankA !== rankB) return rankA - rankB;
      return a.remainingDays - b.remainingDays;
    });
});

const getCategoryMeta = (value?: string): (typeof CATEGORIES)[number] => {
  return (
    CATEGORIES.find((c) => c.value === value) ??
    CATEGORIES[CATEGORIES.length - 1]!
  );
};

const getStatusMeta = (status: string): { color: string; label: string } => {
  return STATUS_META[status] ?? { label: status, color: 'default' };
};

// 加载数据
const loadData = async () => {
  try {
    loading.value = true;
    members.value = await queryMemberships();
  } catch (error) {
    console.error('Failed to load memberships:', error);
  } finally {
    loading.value = false;
  }
};

const loadStats = async () => {
  try {
    statsLoading.value = true;
    stats.value = await getMembershipStats();
  } catch (error) {
    console.error('Failed to load membership stats:', error);
  } finally {
    statsLoading.value = false;
  }
};

onMounted(() => {
  loadData();
  loadStats();
});

// Methods
const handleAdd = () => {
  modalTitle.value = '添加会员';
  formState.value = emptyForm();
  modalVisible.value = true;
};

const handleEdit = (item: MembershipVO) => {
  modalTitle.value = '编辑会员';
  formState.value = {
    id: item.id,
    name: item.name,
    category: item.category,
    provider: item.provider || '',
    color: item.color || COLOR_PRESETS[0],
    startDate: item.startDate ? dayjs(item.startDate) : undefined,
    expiryDate: item.expiryDate ? dayjs(item.expiryDate) : undefined,
    price: item.price,
    billingCycle: item.billingCycle || 'month',
    monthlyAmount: item.monthlyAmount ?? item.price,
    autoRenew: item.autoRenew === 1,
    note: item.note || '',
  };
  modalVisible.value = true;
};

const handleDelete = async (id: string) => {
  try {
    await deleteMembership(id);
    message.success('删除成功');
    loadData();
    loadStats();
  } catch (error) {
    console.error('Failed to delete membership:', error);
    message.error('删除失败');
  }
};

const handleSave = async () => {
  try {
    await formRef.value.validate();
    submitLoading.value = true;

    const payload: MembershipReq = {
      id: formState.value.id,
      name: formState.value.name,
      category: formState.value.category || 'other',
      provider: formState.value.provider || undefined,
      color: formState.value.color,
      startDate: formState.value.startDate?.format('YYYY-MM-DD'),
      expiryDate: formState.value.expiryDate!.format('YYYY-MM-DD'),
      price: formState.value.price,
      billingCycle: formState.value.billingCycle,
      monthlyAmount: formState.value.monthlyAmount,
      autoRenew: formState.value.autoRenew ? 1 : 0,
      note: formState.value.note || undefined,
    };

    if (formState.value.id) {
      await updateMembership(payload);
      message.success('更新成功');
    } else {
      await createMembership(payload);
      message.success('添加成功');
    }

    modalVisible.value = false;
    loadData();
    loadStats();
  } catch (error) {
    console.error('Validate Failed:', error);
  } finally {
    submitLoading.value = false;
  }
};

const clearFilters = () => {
  filters.value = { keyword: '', category: undefined };
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

const getBillingCycleLabel = (value?: string) => {
  return BILLING_CYCLES.find((item) => item.value === value)?.label ?? '一个月';
};

const formatAmount = (value?: number) => Number(value ?? 0).toFixed(2);
</script>

<template>
  <div class="min-h-full bg-background/50 p-4">
    <!-- Stats -->
    <div class="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div
        class="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
      >
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500/10 text-green-500"
        >
          <IconifyIcon icon="mdi:check-circle-outline" class="text-xl" />
        </div>
        <div>
          <p class="text-xs text-muted-foreground">生效中</p>
          <p
            class="mt-0.5 text-2xl font-bold leading-none text-card-foreground"
          >
            {{ stats.activeCount }}
          </p>
        </div>
      </div>
      <div
        class="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
      >
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500"
        >
          <IconifyIcon icon="mdi:calendar-alert" class="text-xl" />
        </div>
        <div>
          <p class="text-xs text-muted-foreground">本月到期</p>
          <p class="mt-0.5 text-2xl font-bold leading-none text-orange-500">
            {{ stats.expiringThisMonthCount }}
          </p>
        </div>
      </div>
      <div
        class="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
      >
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500"
        >
          <IconifyIcon icon="mdi:clock-alert-outline" class="text-xl" />
        </div>
        <div>
          <p class="text-xs text-muted-foreground">即将到期</p>
          <p
            class="mt-0.5 text-2xl font-bold leading-none text-card-foreground"
          >
            {{ stats.expiringCount }}
          </p>
        </div>
      </div>
      <div
        class="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
      >
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500"
        >
          <IconifyIcon icon="mdi:cash-multiple" class="text-xl" />
        </div>
        <div>
          <p class="text-xs text-muted-foreground">当前月均</p>
          <p class="mt-0.5 text-xl font-bold leading-none text-blue-500">
            ￥{{ formatAmount(stats.monthlyAmount) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div class="flex flex-wrap items-center gap-4">
        <AInput
          v-model:value="filters.keyword"
          placeholder="搜索会员名称、平台..."
          class="w-64"
          allow-clear
        >
          <template #prefix><SearchOutlined class="text-gray-400" /></template>
        </AInput>

        <ASelect
          v-model:value="filters.category"
          placeholder="分类筛选"
          class="w-40"
          allow-clear
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

        <AButton @click="clearFilters">重置</AButton>
      </div>
    </div>

    <!-- Card Grid -->
    <ASpin :spinning="loading">
      <div
        v-if="filteredMembers.length === 0 && !loading"
        class="py-20 text-center text-gray-400"
      >
        <AEmpty description="暂无会员，点击右下角添加" />
      </div>

      <div
        v-else
        class="grid grid-cols-2 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        <div
          v-for="item in filteredMembers"
          :key="item.id"
          class="group relative cursor-pointer rounded-2xl border border-border bg-card p-4 transition-colors duration-200 hover:border-border/60 hover:shadow-sm sm:p-5"
          @click="handleEdit(item)"
        >
          <div class="mb-3 flex items-center gap-3">
            <div class="min-w-0 flex-1">
              <h3
                class="truncate text-lg font-bold text-card-foreground"
                :title="item.name"
              >
                {{ item.name }}
              </h3>
              <p
                v-if="item.provider"
                class="truncate text-xs text-muted-foreground"
              >
                {{ item.provider }}
              </p>
            </div>
            <span v-if="item.autoRenew === 1" class="shrink-0">
              <ATag color="processing" class="m-0 border-0 text-xs">
                <span class="inline-flex items-center gap-0.5">
                  <IconifyIcon icon="mdi:autorenew" />
                  自动续费
                </span>
              </ATag>
            </span>
          </div>

          <div class="mb-3 flex flex-wrap items-center gap-1.5">
            <ATag
              :color="getStatusMeta(item.status).color"
              class="m-0 border-0 font-medium"
            >
              {{ getStatusMeta(item.status).label }}
            </ATag>
            <ATag class="m-0 border-0 font-medium">
              <span class="inline-flex items-center gap-1">
                <IconifyIcon :icon="getCategoryMeta(item.category).icon" />
                {{ getCategoryMeta(item.category).label }}
              </span>
            </ATag>
          </div>

          <!-- 到期信息 -->
          <div class="mt-4 flex items-center justify-between">
            <span
              class="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <CalendarOutlined class="opacity-50" />
              <span class="font-medium text-card-foreground/80">
                {{ item.expiryDate }}
              </span>
            </span>
            <span
              class="rounded-full px-2 py-0.5 text-xs font-semibold"
              :class="
                item.status === 'expired'
                  ? 'bg-gray-500/10 text-gray-400'
                  : item.remainingDays <= 7
                    ? 'bg-orange-500/10 text-orange-500'
                    : 'bg-green-500/10 text-green-500'
              "
            >
              {{
                item.status === 'expired'
                  ? '已过期'
                  : `剩 ${item.remainingDays} 天`
              }}
            </span>
          </div>

          <!-- 金额 -->
          <div class="mt-3 border-t border-dashed border-border/60 pt-3">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs text-muted-foreground">
                {{ getBillingCycleLabel(item.billingCycle) }} ￥{{
                  formatAmount(item.price)
                }}
              </span>
              <span
                class="text-base font-bold leading-none text-card-foreground"
              >
                月均 ￥{{ formatAmount(item.monthlyAmount) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </ASpin>

    <!-- Add/Edit Modal -->
    <AModal
      v-model:open="modalVisible"
      :confirm-loading="submitLoading"
      width="600px"
      :centered="true"
      :closable="false"
      :body-style="{ padding: '28px 24px 12px' }"
    >
      <template #footer>
        <div class="flex items-center justify-between">
          <APopconfirm
            v-if="formState.id"
            title="确定删除该会员吗？"
            ok-text="删除"
            cancel-text="取消"
            @confirm="handleDelete(formState.id!)"
          >
            <AButton danger>删除</AButton>
          </APopconfirm>
          <div v-else></div>
          <div class="flex gap-2">
            <AButton @click="modalVisible = false">取消</AButton>
            <AButton
              type="primary"
              :loading="submitLoading"
              @click="handleSave"
            >
              确定
            </AButton>
          </div>
        </div>
      </template>
      <AForm
        ref="formRef"
        :model="formState"
        :rules="rules"
        layout="horizontal"
      >
        <AFormItem label="名称" name="name">
          <AInput
            v-model:value="formState.name"
            placeholder="请输入会员名称"
            allow-clear
          />
        </AFormItem>

        <div class="flex gap-4">
          <AFormItem label="分类" name="category" class="flex-1">
            <ASelect
              v-model:value="formState.category"
              placeholder="请选择分类"
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

          <AFormItem label="平台/服务商" name="provider" class="flex-1">
            <AInput
              v-model:value="formState.provider"
              placeholder="平台/服务商名称"
              allow-clear
            />
          </AFormItem>
        </div>

        <div class="flex gap-4">
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

        <div class="mb-4 flex flex-wrap items-center gap-1.5">
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

        <div class="flex gap-4">
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
                formState.autoRenew
                  ? '到期后自动扣费续期'
                  : '到期后需要手动续费'
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

    <GlobalFloatBtn @click="handleAdd" />
  </div>
</template>
