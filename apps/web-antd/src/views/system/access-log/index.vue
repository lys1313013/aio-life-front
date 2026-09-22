<script setup lang="ts">
import ActivityLogPage from '../activity-log/ActivityLogPage.vue';

defineOptions({ name: 'AccessLog' });
</script>

<template>
  <ActivityLogPage type="access" />
</template>
