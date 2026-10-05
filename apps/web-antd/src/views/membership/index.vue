<script setup lang="ts">
import type { MembershipStatsVO, MembershipVO } from '#/api/membership';

import { computed, onMounted, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { CalendarOutlined } from '@ant-design/icons-vue';
import {
  Empty as AEmpty,
  Switch as ASwitch,
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
const selectedCategory = ref('');
const includeExpired = ref(false);

const modalVisible = ref(false);
const currentMember = ref<MembershipVO>();

// Computed
const getCategoryMeta = (value?: string): (typeof CATEGORIES)[number] => {
  return (
    CATEGORIES.find((c) => c.value === value) ??
    CATEGORIES[CATEGORIES.length - 1]!
  );
};

const visibleMembers = computed(() =>
  members.value.filter(
    (item) => includeExpired.value || item.status !== 'expired',
  ),
);

const categoryTabs = computed(() => {
  const counts = new Map<string, number>();
  for (const item of visibleMembers.value) {
    const category = getCategoryMeta(item.category).value;
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return [
    { value: '', label: '全部', count: visibleMembers.value.length },
    ...CATEGORIES.filter((category) => counts.has(category.value)).map(
      (category) => ({
        value: category.value,
        label: category.label,
        count: counts.get(category.value)!,
      }),
    ),
  ];
});

watch(categoryTabs, (tabs) => {
  if (!tabs.some((tab) => tab.value === selectedCategory.value)) {
    selectedCategory.value = '';
  }
});

const filteredMembers = computed(() => {
  return visibleMembers.value
    .filter(
      (item) =>
        !selectedCategory.value ||
        getCategoryMeta(item.category).value === selectedCategory.value,
    )
    .toSorted((a, b) => {
      const rankA = a.status === 'expired' ? 1 : 0;
      const rankB = b.status === 'expired' ? 1 : 0;
      if (rankA !== rankB) return rankA - rankB;
      return a.remainingDays - b.remainingDays;
    });
});

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
    <div class="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2">
      <nav
        class="order-2 flex w-full min-w-0 gap-6 overflow-x-auto sm:order-1 sm:w-auto sm:flex-1"
        aria-label="会员分类"
        :aria-busy="loading"
      >
        <button
          v-for="tab in categoryTabs"
          :key="tab.value"
          type="button"
          class="flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-1 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          :class="
            selectedCategory === tab.value
              ? 'border-primary font-medium text-primary'
              : 'border-transparent text-muted-foreground hover:text-card-foreground'
          "
          :aria-pressed="selectedCategory === tab.value"
          @click="selectedCategory = tab.value"
        >
          {{ tab.label }}
          <span class="text-xs tabular-nums">{{
            loading ? '—' : tab.count
          }}</span>
        </button>
      </nav>
      <label
        class="order-1 ml-auto flex min-h-11 shrink-0 cursor-pointer items-center gap-2 text-xs text-muted-foreground sm:order-2"
      >
        包含过期
        <ASwitch
          v-model:checked="includeExpired"
          size="small"
          aria-label="包含过期"
        />
      </label>
    </div>

    <!-- Card Grid -->
    <ContentLoading v-if="loading" min-height="calc(100vh - 360px)" />
    <template v-else>
      <div
        v-if="filteredMembers.length === 0 && !loading"
        class="py-20 text-center text-gray-400"
      >
        <AEmpty
          :description="
            members.length > 0 && !includeExpired
              ? '暂无生效中的会员'
              : '暂无会员，点击右下角添加'
          "
        />
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
