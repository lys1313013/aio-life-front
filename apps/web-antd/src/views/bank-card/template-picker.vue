<script setup lang="ts">
import type { CoverOption } from '#/api/bank-card/covers';

import { ref, watch } from 'vue';

import { Button, Empty, Spin } from 'ant-design-vue';

import { listCoverOptions } from '#/api/bank-card/covers';
import { AppModal as Modal } from '#/components/app-modal';

import CardFace from './card-face.vue';

const props = defineProps<{
  bankId?: null | string;
  bankName?: string;
  cardType: string;
  open: boolean;
}>();
const emit = defineEmits<{
  select: [value: CoverOption];
  'update:open': [value: boolean];
}>();
const items = ref<CoverOption[]>([]);
const loading = ref(false);
const failed = ref(false);
let generation = 0;
async function load() {
  const current = ++generation;
  items.value = [];
  failed.value = false;
  if (!props.open || !props.bankId) {
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    const result = await listCoverOptions(props.bankId, props.cardType);
    if (current === generation) items.value = result;
  } catch {
    if (current === generation) failed.value = true;
  } finally {
    if (current === generation) loading.value = false;
  }
}
watch(() => [props.open, props.bankId, props.cardType], load);
</script>
<template>
  <Modal
    :open="open"
    title="选择公共卡面"
    centered
    :width="720"
    :footer="null"
    @cancel="emit('update:open', false)"
  >
    <Spin :spinning="loading">
      <div class="min-h-32">
        <Button v-if="failed" @click="load">加载失败，重试</Button>
        <Empty
          v-else-if="!loading && items.length === 0"
          description="暂无匹配卡面"
        />
        <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div
            v-for="item in items"
            :key="item.id"
            role="button"
            tabindex="0"
            @keydown.space.prevent.self="
              emit('select', item);
              emit('update:open', false);
            "
            @keydown.enter.self="
              emit('select', item);
              emit('update:open', false);
            "
            class="min-w-0 rounded-xl text-left focus-visible:outline"
            :aria-label="`选用${item.name}`"
            @click="
              emit('select', item);
              emit('update:open', false);
            "
          >
            <CardFace
              :file-id="item.fileId"
              :public-url="item.publicUrl"
              :bank-name="bankName"
              :card-type="cardType"
              :card-name="item.name"
            />
            <div class="mt-2 truncate">{{ item.name }}</div>
          </div>
        </div>
      </div>
    </Spin>
  </Modal>
</template>
