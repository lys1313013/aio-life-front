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
              v-for="category in categories"
              :key="category.id"
              class="category-item"
              :class="{ active: isSelected(category.id) }"
              @click="toggleCategoryFilter(category.id)"
            >
              <div class="color-indicator" :style="{ backgroundColor: category.color }"></div>
              <span class="category-name">{{ category.name }}</span>
              <CheckOutlined v-if="isSelected(category.id)" class="check-icon" />
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
        <span v-if="selectedFilterCategoryIds.length > 0" class="filter-badge"></span>
      </Button>
    </Popover>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { FilterOutlined, CheckOutlined } from '@ant-design/icons-vue';
import { Button, Popover } from 'ant-design-vue';
import type { TimeSlotCategory } from '../types';

interface Props {
  categories: TimeSlotCategory[];
  loading?: boolean;
  size?: 'small' | 'middle' | 'large';
  multiple?: boolean;
}

interface Emits {
  (e: 'filterChange', categoryIds: string[] | null): void;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  size: 'middle',
  multiple: false
});

const emit = defineEmits<Emits>();

const selectedFilterCategoryIds = ref<string[]>([]);

const isSelected = (categoryId: string) => {
  return selectedFilterCategoryIds.value.includes(categoryId);
};

const toggleCategoryFilter = (categoryId: string) => {
  if (props.multiple) {
    const index = selectedFilterCategoryIds.value.indexOf(categoryId);
    if (index > -1) {
      selectedFilterCategoryIds.value.splice(index, 1);
    } else {
      selectedFilterCategoryIds.value.push(categoryId);
    }
  } else {
    if (isSelected(categoryId)) {
      selectedFilterCategoryIds.value = [];
    } else {
      selectedFilterCategoryIds.value = [categoryId];
    }
  }
  
  emit('filterChange', selectedFilterCategoryIds.value.length > 0 ? selectedFilterCategoryIds.value : null);
};

// 暴露方法供父组件调用
const clearFilter = () => {
  selectedFilterCategoryIds.value = [];
  emit('filterChange', null);
};

defineExpose({
  clearFilter
});
</script>

<style scoped>
.category-filter {
  display: inline-block;
}

.filter-popover {
  min-width: 160px;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.category-list {
  max-height: 200px;
  overflow-y: auto;
}

.category-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.category-item:hover {
  background-color: #f5f5f5;
}

.category-item.active {
  background-color: #e6f7ff;
}

.color-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 8px;
  flex-shrink: 0;
}

.category-name {
  flex: 1;
  font-size: 14px;
}

.check-icon {
  color: #1890ff;
  margin-left: 4px;
}

.filter-active {
  position: relative;
}

.filter-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 6px;
  height: 6px;
  background-color: #ff4d4f;
  border-radius: 50%;
}
</style>