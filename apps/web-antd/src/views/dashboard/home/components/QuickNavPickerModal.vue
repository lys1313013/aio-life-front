<script setup lang="ts">
import type { QuickNavCandidate } from '#/api/core/quick-nav';

import { computed, ref, watch } from 'vue';

import { VbenIcon } from '@vben/common-ui';

import {
  Button as AButton,
  Empty as AEmpty,
  Spin as ASpin,
  Tag as ATag,
  Tree as ATree,
  message,
} from 'ant-design-vue';

import { getQuickNavCandidatesApi, QUICK_NAV_MAX } from '#/api/core/quick-nav';
import { AppModal as AModal, AppModalFooter } from '#/components/app-modal';

const props = defineProps<{
  /** 已经保存过的 menuId 集合（来自当前布局） */
  existingMenuIds: string[];
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'cancel'): void;
  (e: 'confirm', menuIds: string[]): void;
}>();

const loading = ref(false);
const candidates = ref<QuickNavCandidate[]>([]);
const checked = ref<string[]>([]);
const error = ref<null | string>(null);

const existing = computed(() => new Set(props.existingMenuIds));
const remaining = computed(() => QUICK_NAV_MAX - existing.value.size);

const treeData = computed(() => {
  const groups = new Map<string, QuickNavCandidate[]>();
  for (const c of candidates.value) {
    const key = c.parentTitle ?? '其他';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }
  return Array.from(groups.entries()).map(([groupTitle, items]) => ({
    children: items.map((c) => ({
      checkable: !existing.value.has(c.menuId),
      disabled: existing.value.has(c.menuId),
      icon: c.icon,
      color: c.color,
      key: c.menuId,
      title: c.title,
    })),
    key: `__group__${groupTitle}`,
    title: groupTitle,
  }));
});

watch(
  () => props.visible,
  (val) => {
    if (val) loadCandidates();
    else checked.value = [];
  },
);

async function loadCandidates() {
  loading.value = true;
  error.value = null;
  try {
    candidates.value = await getQuickNavCandidatesApi();
  } catch (error_) {
    error.value = (error_ as Error).message ?? '菜单加载失败';
  } finally {
    loading.value = false;
  }
}

function onCheck(checkedKeys: (number | string)[]) {
  const ids = checkedKeys.map(String).filter((k) => !k.startsWith('__group__'));
  if (ids.length > remaining.value) {
    message.warning(`快捷导航最多 ${QUICK_NAV_MAX} 项`);
  }
  checked.value = ids.slice(0, remaining.value);
}

function handleOk() {
  emit('confirm', checked.value);
}

function handleCancel() {
  emit('cancel');
}
</script>

<template>
  <AModal
    :open="visible"
    title=""
    :width="520"
    :footer="null"
    @cancel="handleCancel"
  >
    <div v-if="loading" class="flex items-center justify-center py-10">
      <ASpin />
    </div>
    <AEmpty v-else-if="error" :description="error">
      <AButton type="primary" @click="loadCandidates">重试</AButton>
    </AEmpty>
    <AEmpty
      v-else-if="candidates.length === 0"
      description="暂无可添加的菜单"
    />
    <div v-else>
      <ATag color="blue" class="mb-2">
        已选 {{ checked.length }} / {{ remaining }}
      </ATag>
      <ATree
        :checked-keys="checked"
        :tree-data="treeData"
        :checkable="true"
        :selectable="false"
        :default-expand-all="false"
        block-line
        @update:checked-keys="onCheck"
      >
        <template #title="{ title, icon, color, disabled }">
          <span class="inline-flex items-center gap-1">
            <VbenIcon
              v-if="icon"
              :icon="icon"
              :style="{ color: color || undefined }"
              class="text-base"
            />
            <span>{{ title }}</span>
            <ATag v-if="disabled" color="default" class="!ml-1">已添加</ATag>
          </span>
        </template>
      </ATree>
      <AppModalFooter
        :confirm-disabled="checked.length === 0"
        :confirm-text="`确认 (${checked.length})`"
        @cancel="handleCancel"
        @confirm="handleOk"
      />
    </div>
  </AModal>
</template>
