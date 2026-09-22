<script setup lang="ts">
import ActivityLogPage from '../activity-log/ActivityLogPage.vue';

defineOptions({ name: 'OperationLog' });
</script>

<template>
  <ActivityLogPage type="operation" />
</template>
