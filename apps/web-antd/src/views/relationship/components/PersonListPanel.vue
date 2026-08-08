<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';

import { SearchOutlined } from '@ant-design/icons-vue';
import { Empty, Input } from 'ant-design-vue';

import { getCategoryColor } from '../constants';

interface PersonListItem {
  category?: string;
  id: string;
  name: string;
  relationshipCount: number;
}

const props = defineProps<{
  persons: PersonListItem[];
  selectedId?: null | string;
}>();

const emit = defineEmits<{
  (e: 'select', id: string): void;
}>();

const keyword = ref('');
const listRef = ref<HTMLDivElement | null>(null);

const filteredPersons = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  const sorted = [...props.persons].sort(
    (a, b) => b.relationshipCount - a.relationshipCount,
  );
  if (!kw) return sorted;
  return sorted.filter((p) => p.name.toLowerCase().includes(kw));
});

// 图谱点击节点 → 列表滚动到可见
watch(
  () => props.selectedId,
  async (id) => {
    if (!id) return;
    await nextTick();
    const el = listRef.value?.querySelector(`[data-person-id="${id}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },
);
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="shrink-0 px-3 pt-3">
      <Input v-model:value="keyword" allow-clear placeholder="搜索人物">
        <template #prefix>
          <SearchOutlined class="text-muted-foreground" />
        </template>
      </Input>
    </div>
    <div ref="listRef" class="mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-2">
      <template v-if="filteredPersons.length > 0">
        <div
          v-for="p in filteredPersons"
          :key="p.id"
          :data-person-id="p.id"
          class="person-item"
          :class="{ 'person-item--active': p.id === selectedId }"
          @click="emit('select', p.id)"
        >
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-medium text-card-foreground">
              {{ p.name }}
            </div>
            <div
              v-if="p.category"
              class="mt-0.5 flex items-center text-xs text-muted-foreground"
            >
              <span
                class="mr-1 inline-block h-2 w-2 rounded-full"
                :style="{ backgroundColor: getCategoryColor(p.category) }"
              ></span>
              {{ p.category }}
            </div>
          </div>
          <span
            class="ml-2 shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground"
          >
            {{ p.relationshipCount }} 条关系
          </span>
        </div>
      </template>
      <Empty
        v-else
        :description="keyword ? '未找到匹配人物' : '暂无人物'"
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
        class="mt-8"
      />
    </div>
  </div>
</template>

<style scoped>
.person-item {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.person-item:hover {
  background-color: hsl(var(--secondary));
}

.person-item--active,
.person-item--active:hover {
  background-color: hsl(var(--primary) / 0.12);
  box-shadow: inset 2px 0 0 0 hsl(var(--primary));
}
</style>
