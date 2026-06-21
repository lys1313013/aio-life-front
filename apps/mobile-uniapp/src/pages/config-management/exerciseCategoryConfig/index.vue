<template>
  <view class="container">
    <view class="header">
      <text class="title">运动分类配置</text>
    </view>
    <view class="list">
      <view v-if="loading" class="loading">加载中...</view>
      <view v-else-if="list.length === 0" class="empty">暂无分类数据</view>
      <view v-else class="list-item" v-for="item in list" :key="item.id">
        <view class="item-icon" :style="{ backgroundColor: item.remark || '#2b70d4' }">
          <text class="icon-text">{{ item.dictLabel ? item.dictLabel.charAt(0) : '动' }}</text>
        </view>
        <view class="item-content">
          <text class="item-label">{{ item.dictLabel }}</text>
          <text class="item-value">编码: {{ item.dictValue }}</text>
        </view>
        <view class="item-status" :class="item.status === 0 ? 'active' : 'inactive'">
          {{ item.status === 0 ? '启用' : '停用' }}
        </view>
      </view>
    </view>
    <view class="fab" @click="handleAdd">
      <text class="fab-icon">+</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { query } from '@/api/sysDictData';

const list = ref<any[]>([]);
const loading = ref(true);

const fetchList = async () => {
  try {
    loading.value = true;
    const res = await query({ pageNum: 1, pageSize: 50, condition: {}, dictType: 'exercise_type' });
    list.value = res?.records || res?.items || res?.data || res?.list || (Array.isArray(res) ? res : []);
  } catch (error) {
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
};

const handleAdd = () => {
  uni.showToast({ title: '暂不支持在移动端添加', icon: 'none' });
};

onMounted(() => {
  fetchList();
});
</script>

<style lang="scss" scoped>
.container {
  padding: 20rpx;
  background-color: #f5f6f8;
  min-height: 100vh;
  position: relative;
}
.header {
  padding: 20rpx 0;
  margin-bottom: 20rpx;
}
.title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}
.loading, .empty {
  text-align: center;
  color: #999;
  font-size: 28rpx;
  padding: 40rpx 0;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  padding-bottom: 120rpx;
}
.list-item {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}
.item-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
}
.icon-text {
  color: #fff;
  font-size: 36rpx;
  font-weight: bold;
}
.item-content {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  flex: 1;
}
.item-label {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}
.item-value {
  font-size: 26rpx;
  color: #666;
}
.item-status {
  font-size: 24rpx;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  &.active {
    background-color: #e6f7f2;
    color: #00b8a3;
  }
  &.inactive {
    background-color: #ffeaea;
    color: #ef4743;
  }
}
.fab {
  position: fixed;
  right: 40rpx;
  bottom: 80rpx;
  width: 100rpx;
  height: 100rpx;
  background-color: #2b70d4;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 16rpx rgba(43, 112, 212, 0.4);
  z-index: 99;
  &:active {
    opacity: 0.8;
  }
}
.fab-icon {
  color: #fff;
  font-size: 60rpx;
  font-weight: 300;
  line-height: 1;
  margin-top: -8rpx;
}
</style>
