<script setup lang="ts">
import type { MergedCategory, TimeSlotCategory } from '../types';

import { computed, ref } from 'vue';

import { CheckOutlined, FilterOutlined } from '@ant-design/icons-vue';
import { Button, Popover } from 'ant-design-vue';

import { getCategoryColor, getCategoryName } from '../config';

interface Props {
  categories: (MergedCategory | TimeSlotCategory)[];
  loading?: boolean;
  size?: 'large' | 'middle' | 'small';
  multiple?: boolean;
}

interface Emits {
  (e: 'filterChange', categoryIds: null | string[]): void;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  size: 'middle',
  multiple: false,
});

const emit = defineEmits<Emits>();

const selectedFilterCategoryIds = ref<string[]>([]);

// 分类计算属性
const visibleCategories = computed(() => {
  return props.categories.filter((c) => !('isHidden' in c && c.isHidden));
});

// 获取显示颜色
const getDisplayColor = (category: MergedCategory | TimeSlotCategory) => {
  return getCategoryColor(category.id, props.categories);
};

// 获取显示名称
const getDisplayName = (category: MergedCategory | TimeSlotCategory) => {
  return getCategoryName(category.id, props.categories);
};

const isSelected = (categoryId: string) => {
  return selectedFilterCategoryIds.value.includes(categoryId);
};

const toggleCategoryFilter = (categoryId: string) => {
  if (props.multiple) {
    const index = selectedFilterCategoryIds.value.indexOf(categoryId);
    if (index === -1) {
      selectedFilterCategoryIds.value.push(categoryId);
    } else {
      selectedFilterCategoryIds.value.splice(index, 1);
    }
  } else {
    selectedFilterCategoryIds.value = isSelected(categoryId)
      ? []
      : [categoryId];
  }

  emit(
    'filterChange',
    selectedFilterCategoryIds.value.length > 0
      ? selectedFilterCategoryIds.value
      : null,
  );
};

// 暴露方法供父组件调用
const clearFilter = () => {
  selectedFilterCategoryIds.value = [];
  emit('filterChange', null);
};

defineExpose({
  clearFilter,
});
</script>

<template>
  <div class="category-filter">
    <Popover placement="bottom" trigger="click">
      <template #content>
        <div class="filter-popover">
          <div class="filter-header">
            <span>筛选分类</span>
            <Button
              type="link"
              size="small"
              @click="clearFilter"
              :disabled="selectedFilterCategoryIds.length === 0"
            >
              清除筛选
            </Button>
          </div>
          <div class="category-list">
            <div
              v-for="category in visibleCategories"
              :key="category.id"
              class="category-item"
              :class="{ active: isSelected(category.id) }"
              @click="toggleCategoryFilter(category.id)"
            >
              <div
                class="color-indicator"
                :style="{ backgroundColor: getDisplayColor(category) }"
              ></div>
              <span class="category-name">{{ getDisplayName(category) }}</span>
              <CheckOutlined
                v-if="isSelected(category.id)"
                class="check-icon"
              />
            </div>

            <!-- 如果没有分类 -->
            <div v-if="visibleCategories.length === 0" class="empty-text">
              暂无分类
            </div>
          </div>
        </div>
      </template>
      <Button
        type="default"
        :disabled="loading"
        :size="size"
        :class="{ 'filter-active': selectedFilterCategoryIds.length > 0 }"
      >
        <template #icon>
          <FilterOutlined />
        </template>
        <span
          v-if="selectedFilterCategoryIds.length > 0"
          class="filter-badge"
        ></span>
      </Button>
    </Popover>
  </div>
</template>

<style scoped>
.category-filter {
  display: inline-block;
}

.filter-active {
  position: relative;
  color: var(--ant-primary-color);
  border-color: var(--ant-primary-color);
}

.filter-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 8px;
  height: 8px;
  background-color: #ff4d4f;
  border: 1px solid #fff;
  border-radius: 50%;
}

.filter-popover {
  width: 250px;
}

.filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  margin-bottom: 8px;
  font-weight: 500;
  border-bottom: 1px solid #f0f0f0;
}

.category-list {
  max-height: 300px;
  overflow-y: auto;
}

.category-group {
  margin-bottom: 12px;
}

.group-title {
  padding: 4px 8px;
  margin-bottom: 4px;
  font-size: 12px;
  color: #999;
  background: #fafafa;
  border-radius: 4px;
}

.category-item {
  display: flex;
  align-items: center;
  padding: 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.3s;
}

.category-item:hover {
  background-color: #f5f5f5;
}

.category-item.active {
  background-color: #e6f7ff;
}

.color-indicator {
  flex-shrink: 0;
  width: 12px;
  height: 12px;
  margin-right: 8px;
  border-radius: 50%;
}

.category-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.override-tag {
  padding: 0 4px;
  margin-right: 8px;
  font-size: 10px;
  color: #1890ff;
  background: #fff7e6;
  border: 1px solid #91d5ff;
  border-radius: 2px;
}

.check-icon {
  color: #1890ff;
}

.empty-text {
  padding: 16px 0;
  color: #999;
  text-align: center;
}
</style>
