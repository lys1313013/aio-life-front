<template>
  <Modal
    v-model:open="visible"
    :title="title"
    :width="isMobile ? '90%' : 600"
    :footer="null"
    :destroy-on-close="true"
  >
    <FormDrawer
      :values="currentRow"
      @table-reload="handleSuccess"
      @close="close"
    />
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Modal } from 'ant-design-vue';
import { usePreferences } from '@vben/preferences';
import FormDrawer from '../form-drawer.vue';

const emit = defineEmits(['success']);

const visible = ref(false);
const currentRow = ref<any>(null);
const { isMobile } = usePreferences();

const title = computed(() => currentRow.value ? '编辑运动记录' : '新增运动记录');

const open = (row?: any) => {
  currentRow.value = row;
  visible.value = true;
};

const close = () => {
  visible.value = false;
  currentRow.value = null;
};

const handleSuccess = () => {
  emit('success');
};

defineExpose({ open });
</script>
