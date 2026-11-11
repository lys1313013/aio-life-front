<script setup lang="ts">
import type { QueryField } from '#/api/core/data-query';

import { Tag } from 'ant-design-vue';

defineProps<{ field?: QueryField; name: string }>();
</script>

<template>
  <div v-if="field" class="field-info">
    <h3 class="break-words font-mono text-base font-semibold">{{ name }}</h3>
    <p class="mt-1 text-muted-foreground">{{ field.label }}</p>
    <Tag class="mt-3">{{ field.graphqlType }}</Tag>
    <dl class="mt-5 grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 text-sm">
      <dt class="text-muted-foreground">可空</dt>
      <dd>{{ field.nullable ? '是' : '否' }}</dd>
      <template v-if="field.unit">
        <dt class="text-muted-foreground">单位</dt>
        <dd>{{ field.unit }}</dd>
      </template>
      <dt class="text-muted-foreground">筛选</dt>
      <dd class="break-words font-mono">
        {{ field.filterOperators.join(' · ') || '不支持' }}
      </dd>
      <dt class="text-muted-foreground">排序</dt>
      <dd>{{ field.sortable ? '支持' : '不支持' }}</dd>
      <template v-if="field.aggregateFunctions.length > 0">
        <dt class="text-muted-foreground">汇总</dt>
        <dd class="font-mono">
          {{ field.aggregateFunctions.join(' · ') }}
        </dd>
      </template>
      <template v-if="field.distinctFunctions.length > 0">
        <dt class="text-muted-foreground">去重</dt>
        <dd class="font-mono">
          {{ field.distinctFunctions.join(' · ') }}
        </dd>
      </template>
    </dl>
    <p
      v-if="field.description"
      class="mt-5 text-sm leading-6 text-muted-foreground"
    >
      {{ field.description }}
    </p>
    <div v-if="field.values?.length" class="mt-5 flex flex-wrap gap-1">
      <Tag v-for="value in field.values" :key="value">{{ value }}</Tag>
    </div>
    <slot></slot>
  </div>
  <div v-else class="p-4 text-sm text-muted-foreground">选择字段查看说明</div>
</template>

<style scoped>
.field-info {
  min-width: 0;
  padding: 18px;
}
dd {
  margin: 0;
  min-width: 0;
}
</style>
