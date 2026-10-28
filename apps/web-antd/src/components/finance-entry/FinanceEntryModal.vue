<script setup lang="ts">
import { useVbenModal } from '#/adapter/modal';
import ExpenseFormModal from '#/components/finance-entry/ExpenseFormModal.vue';
import IncomeFormModal from '#/components/finance-entry/IncomeFormModal.vue';

const props = defineProps<{ kind?: 'expense' | 'income' }>();
const emit = defineEmits<{ saved: [] }>();
const [ExpenseModal, expenseApi] = useVbenModal({
  connectedComponent: ExpenseFormModal,
});
const [IncomeModal, incomeApi] = useVbenModal({
  connectedComponent: IncomeFormModal,
});

function open(kind: 'expense' | 'income' = props.kind ?? 'expense') {
  const selectedKind = props.kind ?? kind;
  if (selectedKind === 'expense') {
    if (!props.kind) incomeApi.close();
    expenseApi.setData({ values: {} }).open();
  } else {
    if (!props.kind) expenseApi.close();
    incomeApi.setData({ values: {} }).open();
  }
}

defineExpose({ open });
</script>

<template>
  <ExpenseModal
    v-if="!kind || kind === 'expense'"
    :show-kind-switch="!kind"
    @kind-change="open"
    @saved="emit('saved')"
  />
  <IncomeModal
    v-if="!kind || kind === 'income'"
    :show-kind-switch="!kind"
    @kind-change="open"
    @saved="emit('saved')"
  />
</template>
