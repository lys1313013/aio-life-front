<script setup lang="ts">
import type { WorkbenchQuickNavItem } from '@vben/common-ui';

import type {
  QuickNavCandidate,
  QuickNavItem,
  QuickNavSaveItem,
} from '#/api/core/quick-nav';

import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { VbenIcon } from '@vben/common-ui';

import {
  Button as AButton,
  Empty as AEmpty,
  Spin as ASpin,
  message,
} from 'ant-design-vue';
import draggable from 'vuedraggable';

import { getQuickNavCandidatesApi, QUICK_NAV_MAX } from '#/api/core/quick-nav';
import { useQuickNavStore } from '#/store/quick-nav';

import QuickNavPickerModal from './QuickNavPickerModal.vue';

const store = useQuickNavStore();
const router = useRouter();

const editing = ref(false);
const draft = ref<QuickNavItem[]>([]);
const saving = ref(false);
const pickerVisible = ref(false);

const navItems = computed<WorkbenchQuickNavItem[]>(() =>
  store.items.map((it) => ({
    color: it.color,
    icon: it.icon,
    title: it.title,
    url: it.path,
  })),
);

const isLoading = computed(() => store.loading && !store.loaded);
const loadFailed = computed(() => store.loaded && store.error !== null);
const isEmpty = computed(
  () => store.loaded && !store.error && store.items.length === 0,
);

watch(
  () => store.items,
  (items) => {
    if (!editing.value) {
      draft.value = items.map((i) => ({ ...i }));
    }
  },
  { deep: true, immediate: true },
);

function enterEdit() {
  draft.value = store.items.map((i) => ({ ...i }));
  editing.value = true;
}

function cancelEdit() {
  draft.value = store.items.map((i) => ({ ...i }));
  editing.value = false;
}

async function saveEdit() {
  if (draft.value.length > QUICK_NAV_MAX) {
    message.warning(`快捷导航最多 ${QUICK_NAV_MAX} 项`);
    return;
  }
  await persist(draft.value);
  editing.value = false;
}

async function persist(items: QuickNavItem[]) {
  const payload: QuickNavSaveItem[] = items.map((it, idx) => ({
    enabled: it.enabled,
    menuId: it.menuId,
    sortOrder: idx,
  }));
  saving.value = true;
  try {
    await store.save(payload);
    draft.value = items;
    message.success('已保存');
  } catch (error) {
    message.error(`保存失败：${(error as Error).message ?? '未知错误'}`);
  } finally {
    saving.value = false;
  }
}

function openPicker() {
  pickerVisible.value = true;
}

async function onPickerConfirm(newMenuIds: string[]) {
  pickerVisible.value = false;
  const newIds = newMenuIds.filter(
    (id) => !draft.value.some((d) => d.menuId === id),
  );
  if (newIds.length === 0) return;

  const candidates: QuickNavCandidate[] = await getQuickNavCandidatesApi();
  const byId = new Map(candidates.map((c) => [c.menuId, c]));
  const additions: QuickNavItem[] = [];
  for (const id of newIds) {
    const c = byId.get(id);
    if (!c) continue;
    additions.push({
      color: c.color,
      enabled: 1,
      icon: c.icon,
      menuId: c.menuId,
      path: c.path,
      sortOrder: draft.value.length + additions.length,
      target: c.target,
      title: c.title,
    });
  }
  let next = [...draft.value, ...additions];
  if (next.length > QUICK_NAV_MAX) {
    message.warning(`快捷导航最多 ${QUICK_NAV_MAX} 项，已截断多余项`);
    next = next.slice(0, QUICK_NAV_MAX);
  }

  if (editing.value) {
    draft.value = next;
  } else {
    await persist(next);
  }
}

function removeItem(menuId: string) {
  draft.value = draft.value.filter((d) => d.menuId !== menuId);
}

function handleItemClick(item: WorkbenchQuickNavItem) {
  if (editing.value || !item.url) return;
  if (item.url.startsWith('http')) {
    window.open(item.url, '_blank');
    return;
  }
  router.push(item.url);
}

function retryLoad() {
  store.load();
}

// vuedraggable 改写 draft
const draggableModel = computed({
  get: () => draft.value,
  set: (val: QuickNavItem[]) => {
    draft.value = val;
  },
});

function dragChange() {
  // vuedraggable 内部已通过 setter 更新 draft，无需额外处理
}
</script>

<template>
  <div
    class="quick-nav-shell flex h-full select-none flex-col rounded-xl bg-card text-card-foreground"
  >
    <div
      class="flex items-center justify-between p-2.5 pb-1.5 sm:p-3 sm:pb-1.5"
    >
      <span class="text-base font-semibold">快捷导航</span>
      <!-- 编辑/保存按钮 -->
      <div
        v-if="!isLoading && !loadFailed"
        class="flex items-center gap-1 font-normal"
      >
        <template v-if="editing">
          <AButton size="small" @click="cancelEdit">取消</AButton>
          <AButton
            size="small"
            type="primary"
            :loading="saving"
            @click="saveEdit"
          >
            保存
          </AButton>
        </template>
        <AButton
          v-else-if="!isEmpty"
          size="small"
          type="text"
          class="!px-1.5 text-muted-foreground hover:text-primary"
          title="编辑快捷导航"
          @click="enterEdit"
        >
          <VbenIcon icon="lucide:settings-2" class="size-4" />
        </AButton>
      </div>
    </div>

    <div class="w-full flex-1">
      <!-- 加载/失败/空态 -->
      <div
        v-if="isLoading || loadFailed || isEmpty"
        class="flex min-h-[120px] items-center justify-center bg-card"
      >
        <ASpin v-if="isLoading" />
        <AEmpty
          v-else-if="loadFailed"
          description="加载失败，点击重试"
          class="py-6"
        >
          <AButton type="primary" size="small" @click="retryLoad">重试</AButton>
        </AEmpty>
        <div
          v-else
          class="m-2.5 w-full cursor-pointer rounded-xl border-2 border-dashed border-border p-4 text-center transition-colors hover:border-primary"
          role="button"
          tabindex="0"
          @click="openPicker"
          @keydown.enter="openPicker"
        >
          <div
            class="mx-auto mb-1.5 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"
          >
            <span class="text-xl leading-none">+</span>
          </div>
          <div class="text-xs font-medium">添加你的第一个快捷方式</div>
          <div class="mt-1 text-[10px] text-muted-foreground">
            从菜单中挑选最常用的入口，放到首页一触即达
          </div>
        </div>
      </div>

      <!-- 编辑态：4 列可拖网格 + 末尾 "+" 格 -->
      <div
        v-else-if="editing"
        class="grid grid-cols-5 gap-1 overflow-hidden p-2.5 pt-1.5 sm:p-3 sm:pt-1.5"
      >
        <draggable
          v-model="draggableModel"
          :animation="150"
          item-key="menuId"
          handle=".qn-drag-handle"
          ghost-class="qn-ghost"
          chosen-class="qn-chosen"
          @change="dragChange"
          :component-data="{ class: 'contents' }"
          class="contents"
        >
          <template #item="{ element }">
            <div
              class="group relative flex flex-col items-center justify-center rounded-xl py-2 transition-all hover:bg-accent sm:py-3"
            >
              <!-- 拖拽手柄 -->
              <span
                class="qn-drag-handle absolute left-2 top-2 cursor-grab p-1 text-muted-foreground opacity-30 transition-opacity hover:opacity-100"
                title="拖拽排序"
                aria-hidden="true"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <circle cx="9" cy="12" r="1" />
                  <circle cx="9" cy="5" r="1" />
                  <circle cx="9" cy="19" r="1" />
                  <circle cx="15" cy="12" r="1" />
                  <circle cx="15" cy="5" r="1" />
                  <circle cx="15" cy="19" r="1" />
                </svg>
              </span>
              <AButton
                size="small"
                type="text"
                class="!absolute right-1 top-1 z-10 !h-6 !w-6 !p-0 text-muted-foreground hover:text-destructive"
                @click.stop="removeItem(element.menuId)"
              >
                ×
              </AButton>
              <div class="flex flex-col items-center justify-center">
                <VbenIcon
                  :color="element.color || undefined"
                  :icon="element.icon"
                  class="size-5 sm:size-6"
                />
                <span
                  class="mt-1 truncate text-[10px] sm:mt-1.5 sm:text-xs"
                  :class="{ 'line-through opacity-50': element.enabled === 0 }"
                  >{{ element.title }}</span
                >
              </div>
            </div>
          </template>
        </draggable>

        <!-- 末尾 "+"格：非拖拽项，与 draggable 的 items 共用 4 列网格 -->
        <div
          v-if="draft.length < QUICK_NAV_MAX"
          class="flex cursor-pointer flex-col items-center justify-center rounded-xl py-2 text-muted-foreground transition-all hover:bg-accent sm:py-3"
          @click="openPicker"
        >
          <span class="text-xl">+</span>
          <span class="ml-1 text-[10px]">添加</span>
        </div>
      </div>

      <!-- 默认态 -->
      <div v-else class="grid grid-cols-5 gap-1 p-2.5 pt-1.5 sm:p-3 sm:pt-1.5">
        <template v-for="item in navItems" :key="item.title">
          <div
            class="group flex cursor-pointer flex-col items-center justify-center rounded-xl py-2 transition-all hover:bg-accent sm:py-3"
            @click="handleItemClick(item)"
          >
            <VbenIcon
              :color="item.color || undefined"
              :icon="item.icon"
              class="size-5 transition-all duration-300 group-hover:scale-125 sm:size-6"
            />
            <span class="mt-1 truncate text-[10px] sm:mt-1.5 sm:text-xs">{{
              item.title
            }}</span>
          </div>
        </template>
      </div>
    </div>

    <QuickNavPickerModal
      v-model:visible="pickerVisible"
      :existing-menu-ids="
        editing ? draft.map((d) => d.menuId) : store.items.map((d) => d.menuId)
      "
      @cancel="pickerVisible = false"
      @confirm="onPickerConfirm"
    />
  </div>
</template>

<style scoped>
.quick-nav-shell :deep(.qn-ghost) {
  opacity: 0.4;
}

.quick-nav-shell :deep(.qn-chosen) {
  background: hsl(var(--primary) / 0.06);
}
</style>
