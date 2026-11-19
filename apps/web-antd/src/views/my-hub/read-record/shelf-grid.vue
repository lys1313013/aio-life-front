<script setup lang="ts">
import type { ReadRecordApi } from '#/api/readRecord';

import AuthImage from '#/components/AuthImage.vue';
import RankingBadges from '#/components/RankingBadges.vue';

defineProps<{
  columns: number;
  loading: boolean;
  placeholderCount: number;
  records: ReadRecordApi.ReadRecordVO[];
}>();

defineEmits<{ edit: [record: ReadRecordApi.ReadRecordVO] }>();
</script>

<template>
  <div
    class="grid gap-x-[var(--shelf-column-gap)] gap-y-4 [--ranking-badge-font-size:9px]"
    :style="{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }"
  >
    <div v-for="index in placeholderCount" :key="index" aria-hidden="true">
      <div
        class="aspect-[3/4] rounded bg-muted-foreground/15"
        :class="{ 'animate-pulse motion-reduce:animate-none': loading }"
      ></div>
    </div>
    <button
      v-for="item in records"
      :key="item.id"
      type="button"
      :aria-label="`编辑《${item.title}》`"
      class="flex min-w-0 flex-col items-start text-start"
      @click="$emit('edit', item)"
    >
      <div
        class="aspect-[3/4] w-full overflow-hidden rounded bg-muted shadow-sm transition-shadow hover:shadow-md"
      >
        <AuthImage
          v-if="item.fileId || item.coverImgUrl"
          :file-id="item.fileId || item.coverImgUrl"
          alt=""
          class="h-full w-full object-cover"
        />
        <div
          v-else
          class="flex h-full flex-col items-center justify-center gap-1 px-1 text-center text-muted-foreground"
        >
          <span aria-hidden="true" class="text-2xl">📖</span>
          <span class="line-clamp-3 text-xs">{{ item.title }}</span>
        </div>
      </div>
      <time
        v-if="item.finishDate"
        :datetime="item.finishDate"
        class="mt-1 self-center text-[11px] tabular-nums leading-4 text-muted-foreground"
      >
        {{ item.finishDate }}
      </time>
      <div
        v-if="(item.rankings?.length ?? 0) > 0"
        class="flex w-full flex-col items-center"
      >
        <RankingBadges :rankings="item.rankings" wrap-name />
      </div>
    </button>
  </div>
</template>
