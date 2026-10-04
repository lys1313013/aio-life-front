<script setup lang="ts">
import type { MembershipStatsVO, MembershipVO } from '#/api/membership';

import { computed, onMounted, ref } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { CalendarOutlined, SearchOutlined } from '@ant-design/icons-vue';
import {
  Button as AButton,
  Empty as AEmpty,
  Input as AInput,
  Select as ASelect,
  SelectOption as ASelectOption,
  Tag as ATag,
} from 'ant-design-vue';

import { getMembershipStats, queryMemberships } from '#/api/membership';
import ContentLoading from '#/components/ContentLoading.vue';
import GlobalFloatBtn from '#/components/global-float-btn/index.vue';

import { BILLING_CYCLES, CATEGORIES } from './constants';
import MembershipFormModal from './form-modal.vue';
import MembershipLogo from './MembershipLogo.vue';

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

const modalVisible = ref(false);
const currentMember = ref<MembershipVO>();

// Computed
const filteredMembers = computed(() => {
  return members.value
    .filter((item) => {
      if (filters.value.keyword) {
        const kw = filters.value.keyword.toLowerCase();
        const matchName = item.name.toLowerCase().includes(kw);
        const matchProvider = (item.providerName || item.provider || '')
          .toLowerCase()
          .includes(kw);
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

const handleAdd = () => {
  currentMember.value = undefined;
  modalVisible.value = true;
};

const handleEdit = (item: MembershipVO) => {
  currentMember.value = item;
  modalVisible.value = true;
};

const handleSaved = (item: MembershipVO) => {
  const index = members.value.findIndex((member) => member.id === item.id);
  if (index === -1) members.value.unshift(item);
  else members.value.splice(index, 1, item);
  loadStats();
};

const handleDeleted = (id: string) => {
  members.value = members.value.filter((member) => member.id !== id);
  loadStats();
};

const clearFilters = () => {
  filters.value = { keyword: '', category: undefined };
};

const getBillingCycleLabel = (value?: string) => {
  return BILLING_CYCLES.find((item) => item.value === value)?.label ?? '月';
};

const formatAmount = (value?: number) => Number(value ?? 0).toFixed(2);
</script>

<template>
  <div class="min-h-full bg-background/50 p-4">
    <!-- Stats -->
    <section
      class="mb-4 flex flex-col gap-3 py-2 text-card-foreground sm:flex-row sm:items-center sm:gap-6"
      aria-label="订阅概览"
      :aria-busy="statsLoading"
    >
      <div class="min-w-0 flex-1">
        <p class="text-xs text-muted-foreground">当前月均</p>
        <p
          class="mt-1 break-all text-[28px] font-medium tabular-nums leading-10"
          :class="{ 'animate-pulse': statsLoading }"
        >
          {{ statsLoading ? '—' : `¥${formatAmount(stats.monthlyAmount)}` }}
        </p>
      </div>
      <dl class="grid min-w-0 grid-cols-3 gap-2 sm:flex-[2] sm:gap-4">
        <div>
          <dt class="text-xs text-muted-foreground">生效中</dt>
          <dd class="mt-1 text-xl font-medium tabular-nums leading-7">
            {{ statsLoading ? '—' : stats.activeCount }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-muted-foreground">本月到期</dt>
          <dd class="mt-1 text-xl font-medium tabular-nums leading-7">
            {{ statsLoading ? '—' : stats.expiringThisMonthCount }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-muted-foreground">即将到期</dt>
          <dd
            class="mt-1 text-xl font-medium tabular-nums leading-7"
            :class="{
              'text-amber-700 dark:text-amber-400': stats.expiringCount > 0,
            }"
          >
            {{ statsLoading ? '—' : stats.expiringCount }}
          </dd>
        </div>
      </dl>
    </section>

    <!-- Filters -->
    <div class="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div class="flex flex-wrap items-center gap-3">
        <AInput
          v-model:value="filters.keyword"
          placeholder="搜索会员名称、平台..."
          class="w-full sm:w-64"
          allow-clear
        >
          <template #prefix><SearchOutlined class="text-gray-400" /></template>
        </AInput>

        <ASelect
          v-model:value="filters.category"
          placeholder="分类筛选"
          class="w-full sm:w-40"
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
    <ContentLoading v-if="loading" min-height="calc(100vh - 360px)" />
    <template v-else>
      <div
        v-if="filteredMembers.length === 0 && !loading"
        class="py-20 text-center text-gray-400"
      >
        <AEmpty description="暂无会员，点击右下角添加" />
      </div>

      <div
        v-else
        class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4"
      >
        <div
          v-for="item in filteredMembers"
          :key="item.id"
          class="group relative cursor-pointer rounded-2xl border border-border bg-card p-3 transition-colors duration-200 hover:border-border/60 hover:shadow-sm sm:p-5"
          @click="handleEdit(item)"
        >
          <div class="mb-3 flex flex-wrap items-center gap-2 sm:gap-3">
            <MembershipLogo
              :icon-key="item.providerIconKey"
              :category="item.category"
              :name="item.providerName || item.provider || item.name"
            />
            <div class="min-w-0 flex-1">
              <h3
                class="truncate text-base font-bold text-card-foreground sm:text-lg"
                :title="item.name"
              >
                {{ item.name }}
              </h3>
              <p
                v-if="
                  !item.providerIconKey && (item.providerName || item.provider)
                "
                class="truncate text-xs text-muted-foreground"
              >
                {{ item.providerName || item.provider }}
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
          <div
            class="mt-4 flex flex-wrap items-center justify-between gap-x-1.5 gap-y-1"
          >
            <span
              class="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <CalendarOutlined class="opacity-50" />
              <span class="font-medium text-card-foreground/80">
                {{ item.expiryDate }}
              </span>
            </span>
            <span
              class="ml-auto rounded-full px-2 py-0.5 text-xs font-semibold"
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
            <div
              class="flex flex-wrap items-center justify-between gap-x-2 gap-y-1"
            >
              <span class="text-xs text-muted-foreground">
                {{ getBillingCycleLabel(item.billingCycle) }} ￥{{
                  formatAmount(item.price)
                }}
              </span>
              <span
                class="ml-auto text-xs font-bold leading-none text-card-foreground sm:text-base"
              >
                月均 ￥{{ formatAmount(item.monthlyAmount) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <MembershipFormModal
      v-model:open="modalVisible"
      :values="currentMember"
      @saved="handleSaved"
      @deleted="handleDeleted"
    />

    <GlobalFloatBtn @click="handleAdd" />
  </div>
</template>
