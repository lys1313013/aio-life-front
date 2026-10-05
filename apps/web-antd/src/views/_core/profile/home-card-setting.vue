<script setup lang="ts">
import type { HomeCardPreference } from '#/api/core/home-cards';

import { computed, onMounted, ref, watch } from 'vue';

import { VbenIcon } from '@vben/common-ui';

import { Button, Popconfirm, Spin, Switch } from 'ant-design-vue';
import draggable from 'vuedraggable';

import BusinessIcon from '#/components/BusinessIcon.vue';
import { useHomeCardsStore } from '#/store/home-cards';

const store = useHomeCardsStore();
const drafts = ref<Record<string, HomeCardPreference[]>>({
  overview: [],
  section: [],
});
const groups = [
  { key: 'overview', title: '概览' },
  { key: 'section', title: '详情' },
];
const announcement = ref('');
const disabled = computed(() => !!store.busy || store.loading);
function sync() {
  for (const group of groups)
    drafts.value[group.key] = store.items
      .filter((item) => item.group === group.key)
      .map((item) => ({ ...item }));
}
watch(() => store.items, sync, { immediate: true });
onMounted(() => store.load());
async function toggle(item: HomeCardPreference, enabled: boolean) {
  try {
    await store.toggle(item.cardKey, enabled);
  } catch {
    /* Request interceptor reports failures. */
  }
}
async function reordered(group: string) {
  const keys = drafts.value[group]!.map((item) => item.cardKey);
  const previous = store.items
    .filter((item) => item.group === group)
    .map((item) => item.cardKey);
  if (keys.every((key, index) => key === previous[index])) return;
  try {
    await store.reorder(
      group,
      drafts.value[group]!.map((item) => item.cardKey),
    );
  } catch {
    /* Restore the authoritative order on failure. */
  } finally {
    sync();
  }
}
async function keyboardMove(group: string, index: number, offset: number) {
  const rows = drafts.value[group]!;
  const target = index + offset;
  if (disabled.value || target < 0 || target >= rows.length) return;
  const item = rows.splice(index, 1)[0]!;
  rows.splice(target, 0, item);
  await reordered(group);
  announcement.value = `${item.title}，第 ${drafts.value[group]!.findIndex((row) => row.cardKey === item.cardKey) + 1} 项`;
}
async function reset() {
  try {
    await store.reset();
  } catch {
    /* Keep current preferences. */
  }
}
</script>

<template>
  <div class="home-card-settings">
    <div class="mb-3 flex items-center justify-between">
      <span class="text-base font-medium">首页卡片</span>
      <Popconfirm
        title="恢复全部卡片的默认显示和顺序？"
        placement="bottomRight"
        :disabled="disabled || !store.ready"
        @confirm="reset"
      >
        <Button
          type="text"
          class="!h-11 !w-11"
          aria-label="恢复默认"
          :disabled="disabled || !store.ready"
          :loading="store.busy === 'reset'"
        >
          <VbenIcon
            v-if="store.busy !== 'reset'"
            icon="lucide:rotate-ccw"
            class="size-4"
          />
        </Button>
      </Popconfirm>
    </div>
    <div v-if="store.error" class="mb-3 flex items-center gap-2" role="alert">
      <span>加载失败</span
      ><Button :loading="store.loading" @click="store.load">重试</Button>
    </div>
    <Spin :spinning="store.loading && !store.ready">
      <section
        v-for="group in groups"
        v-show="store.ready"
        :key="group.key"
        class="mb-4"
        :aria-label="group.title"
      >
        <div
          class="mb-1 flex h-8 items-center gap-2 text-sm text-muted-foreground"
        >
          {{ group.title }}<Spin v-if="store.busy === group.key" size="small" />
        </div>
        <draggable
          v-model="drafts[group.key]"
          item-key="cardKey"
          handle=".card-drag-handle"
          :animation="160"
          :delay="250"
          :delay-on-touch-only="true"
          :touch-start-threshold="6"
          :disabled="disabled"
          ghost-class="home-card-ghost"
          chosen-class="home-card-chosen"
          @end="reordered(group.key)"
        >
          <template #item="{ element: item, index }">
            <div class="home-card-row" :data-card-key="item.cardKey">
              <button
                type="button"
                class="card-drag-handle"
                :aria-label="`调整${item.title}顺序，使用上下方向键`"
                :disabled="disabled"
                @keydown.up.prevent="keyboardMove(group.key, index, -1)"
                @keydown.down.prevent="keyboardMove(group.key, index, 1)"
              >
                <VbenIcon icon="lucide:grip-vertical" class="size-4" />
              </button>
              <BusinessIcon :card-key="item.cardKey" class="size-5 shrink-0" />
              <span class="min-w-0 flex-1 text-sm">{{ item.title }}</span>
              <Switch
                :checked="item.enabled"
                :aria-label="`显示${item.title}`"
                :disabled="disabled"
                :loading="store.busy === item.cardKey"
                @change="toggle(item, Boolean($event))"
              />
            </div>
          </template>
        </draggable>
      </section>
    </Spin>
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </div>
</template>
<style scoped>
.home-card-settings {
  width: 100%;
  max-width: 640px;
}

.home-card-row {
  display: flex;
  align-items: center;
  min-height: 48px;
  gap: 12px;
  padding-right: 8px;
  border-radius: 6px;
  background: hsl(var(--card));
}

.card-drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  color: hsl(var(--muted-foreground));
  opacity: 0.6;
  cursor: grab;
  touch-action: none;
}

.card-drag-handle:hover,
.card-drag-handle:focus-visible {
  opacity: 1;
}

.card-drag-handle:active {
  cursor: grabbing;
}

.home-card-ghost {
  opacity: 0.3;
  background: hsl(var(--accent));
}

.home-card-chosen {
  box-shadow: 0 3px 12px rgb(0 0 0 / 8%);
}
</style>
