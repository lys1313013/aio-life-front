<script setup lang="ts">
import ActivityLogPage from '../activity-log/ActivityLogPage.vue';
import ExportAuditPanel from './ExportAuditPanel.vue';

defineOptions({ name: 'OperationLog' });
</script>

<template>
  <ActivityLogPage type="operation">
    <template #actions>
      <ExportAuditPanel />
    </template>
  </ActivityLogPage>
</template>
