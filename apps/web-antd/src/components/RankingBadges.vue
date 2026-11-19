<script setup lang="ts">
import type { RankingBadgeVO } from '#/api/payload';

defineProps<{ rankings?: null | RankingBadgeVO[]; wrapName?: boolean }>();
</script>

<template>
  <span
    v-for="badge in rankings"
    :key="badge.rankingListId ?? badge.name ?? ''"
    class="ranking-badge"
    :class="{ 'ranking-badge-wrap-name': wrapName }"
    :title="badge.name ?? ''"
  >
    <strong v-if="badge.rank != null">No.{{ badge.rank }}</strong>
    <span>{{ badge.name }}</span>
  </span>
</template>

<style scoped>
.ranking-badge {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  margin-top: 4px;
  border-radius: 3px;
  background: #ffe298;
  color: #624407;
  font-size: var(--ranking-badge-font-size, 10px);
  line-height: 16px;
}

.ranking-badge strong {
  flex: none;
  padding: 0 4px;
  background: #ffd365;
  border-radius: 3px;
}

.ranking-badge span {
  padding: 0 4px;
}

.ranking-badge:not(.ranking-badge-wrap-name) span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ranking-badge-wrap-name {
  align-items: stretch;
}

.ranking-badge-wrap-name strong {
  display: flex;
  align-items: center;
}

.ranking-badge-wrap-name span {
  min-width: 0;
  overflow-wrap: anywhere;
}
</style>
