<script setup lang="ts">
import ActivityLogPage from '../activity-log/ActivityLogPage.vue';
import ExportAuditPanel from './ExportAuditPanel.vue';

defineOptions({ name: 'OperationLog' });
</script>

<template>
  <ExportAuditPanel />
  <ActivityLogPage type="operation" />
</template>
