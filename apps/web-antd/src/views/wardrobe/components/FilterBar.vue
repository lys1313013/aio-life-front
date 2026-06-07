<script setup lang="ts">
import type { CategoryVO } from '#/api/wardrobe';

import { computed, ref } from 'vue';

import { SearchOutlined } from '@ant-design/icons-vue';
import { Input, Select, SelectOption, Tag } from 'ant-design-vue';

const props = defineProps<{
  categories: CategoryVO[];
  keyword?: string;
  selectedCategoryId?: number;
  selectedSeason?: string;
}>();

const emit = defineEmits<{
  'update:keyword': [value?: string];
  'update:selectedCategoryId': [value?: number];
  'update:selectedSeason': [value?: string];
}>();

const flatCategories = computed(() => {
  const result: { id: number; name: string }[] = [];
  const flatten = (cats: CategoryVO[], prefix = '') => {
    for (const cat of cats) {
      result.push({ id: cat.id!, name: prefix + cat.name });
      if (cat.children?.length) {
        flatten(cat.children, `${prefix}  `);
      }
    }
  };
  flatten(props.categories);
  return result;
});

const seasons = ['春', '夏', '秋', '冬'];

const localKeyword = ref(props.keyword || '');

const handleSearch = () => {
  emit('update:keyword', localKeyword.value || undefined);
};
</script>

<template>
  <div class="filter-bar">
    <div class="filter-tags">
      <Select
        :value="selectedCategoryId"
        placeholder="全部分类"
        style="width: 140px"
        allow-clear
        @change="
          (val: any) =>
            emit('update:selectedCategoryId', val as number | undefined)
        "
      >
        <SelectOption
          v-for="cat in flatCategories"
          :key="cat.id"
          :value="cat.id"
        >
          {{ cat.name }}
        </SelectOption>
      </Select>

      <div class="season-tags">
        <Tag
          v-for="s in seasons"
          :key="s"
          :color="selectedSeason === s ? 'blue' : 'default'"
          class="season-tag"
          @click="
            emit('update:selectedSeason', selectedSeason === s ? undefined : s)
          "
        >
          {{ s }}
        </Tag>
      </div>

      <Input
        v-model:value="localKeyword"
        placeholder="搜索名称/颜色/品牌"
        style="width: 200px"
        allow-clear
        @press-enter="handleSearch"
      >
        <template #suffix>
          <SearchOutlined class="search-icon" @click="handleSearch" />
        </template>
      </Input>
    </div>
  </div>
</template>

<style scoped>
.filter-bar {
  margin-bottom: 16px;
}

.filter-tags {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.season-tags {
  display: flex;
  gap: 4px;
}

.season-tag {
  cursor: pointer;
}

.search-icon {
  cursor: pointer;
  color: #999;
}

.search-icon:hover {
  color: #1890ff;
}
</style>
