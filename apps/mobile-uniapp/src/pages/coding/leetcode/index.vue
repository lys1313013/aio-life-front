<template>
  <view class="container">
    <view class="header">
      <text class="title">LeetCode 数据</text>
    </view>
    <view class="stats-grid" v-if="!loading">
      <view class="stat-card total">
        <text class="stat-value">{{ stats.solved }}</text>
        <text class="stat-label">总通过数</text>
      </view>
      <view class="stat-card easy">
        <text class="stat-value">{{ stats.easy }}</text>
        <text class="stat-label">简单</text>
      </view>
      <view class="stat-card medium">
        <text class="stat-value">{{ stats.medium }}</text>
        <text class="stat-label">中等</text>
      </view>
      <view class="stat-card hard">
        <text class="stat-value">{{ stats.hard }}</text>
        <text class="stat-label">困难</text>
      </view>
    </view>
    <view v-else class="loading">加载中...</view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getLeetcodeStatsApi, type LeetcodeStats } from '@/api/leetcode';
import { useUserStore } from '@/store/user';

const stats = ref<LeetcodeStats>({ solved: 0, easy: 0, medium: 0, hard: 0 });
const loading = ref(true);
const userStore = useUserStore();

const fetchData = async () => {
  try {
    loading.value = true;
    const username = userStore.userInfo?.nickname || 'default_user';
    stats.value = await getLeetcodeStatsApi(username);
  } catch (error) {
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchData();
});
</script>

<style lang="scss" scoped>
.container {
  padding: 20rpx;
  background-color: #f5f6f8;
  min-height: 100vh;
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
.loading {
  text-align: center;
  color: #999;
  font-size: 28rpx;
  padding: 40rpx 0;
}
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
}
.stat-card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 40rpx 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);

  &.total {
    grid-column: span 2;
    background: linear-gradient(135deg, #ffa116, #ffc837);
    color: #fff;
    .stat-value { color: #fff; }
    .stat-label { color: rgba(255, 255, 255, 0.9); }
  }
  &.easy .stat-value { color: #00b8a3; }
  &.medium .stat-value { color: #ffc01e; }
  &.hard .stat-value { color: #ef4743; }
}
.stat-value {
  font-size: 48rpx;
  font-weight: bold;
  margin-bottom: 10rpx;
}
.stat-label {
  font-size: 28rpx;
  color: #666;
}
</style>
