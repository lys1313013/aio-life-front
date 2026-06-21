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
        <view class="cat-actions">
          <button size="mini" class="edit-btn" @click="handleEdit">编辑</button>
        </view>
      </view>

      <view class="empty-state" v-if="categories.length === 0">
        <text class="empty-text">暂无分类</text>
      </view>
    </scroll-view>

    <view class="fab" @click="handleAdd">
      <uni-icons type="plusempty" size="24" color="#fff" />
    </view>
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

function handleEdit() {
  uni.showToast({ title: '编辑功能开发中', icon: 'none' });
}

function handleAdd() {
  uni.showToast({ title: '新增功能开发中', icon: 'none' });
}
</script>

<style lang="scss" scoped>
.category-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20rpx;
  padding-bottom: 120rpx;
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

  .cat-actions {
    .edit-btn {
      margin: 0;
      background-color: #f4f4f5;
      color: #909399;
      border: none;
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

.fab {
  position: fixed;
  right: 40rpx;
  bottom: 40rpx;
  width: 100rpx;
  height: 100rpx;
  background-color: #007AFF;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4rpx 16rpx rgba(0, 122, 255, 0.4);
  z-index: 99;
}
</style>
