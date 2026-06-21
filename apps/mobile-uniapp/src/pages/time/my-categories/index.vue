<template>
  <view class="category-container">
    <scroll-view scroll-y class="category-list">
      <view
        v-for="cat in categories"
        :key="cat.id"
        class="category-item"
      >
        <view class="cat-icon-wrap" :style="{ backgroundColor: cat.color || '#007AFF' }">
          <uni-icons :type="cat.icon || 'star'" size="24" color="#fff" />
        </view>
        <view class="cat-info">
          <text class="cat-name">{{ cat.name }}</text>
        </view>
      </view>

      <view class="empty-state" v-if="categories.length === 0">
        <text class="empty-text">暂无分类</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { listCategories } from '@/api/time-tracker-category';
import type { TimeTrackerCategoryEntity } from '@/api/time-tracker-category';

const categories = ref<TimeTrackerCategoryEntity[]>([]);

onMounted(() => {
  fetchData();
});

async function fetchData() {
  try {
    const res = await listCategories();
    if (res) {
      categories.value = res;
    }
  } catch (error) {
    console.error('Failed to fetch categories', error);
  }
}
</script>

<style lang="scss" scoped>
.category-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20rpx;
}

.category-list {
  height: 100%;
}

.category-item {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);

  .cat-icon-wrap {
    width: 80rpx;
    height: 80rpx;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-right: 24rpx;
  }

  .cat-info {
    flex: 1;
    .cat-name {
      font-size: 32rpx;
      color: #333;
      font-weight: 500;
    }
  }
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400rpx;
  .empty-text {
    color: #999;
    font-size: 28rpx;
  }
}
</style>
