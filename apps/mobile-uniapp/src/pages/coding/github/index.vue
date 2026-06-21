<template>
  <view class="container">
    <view class="header">
      <text class="title">GitHub 数据</text>
    </view>
    <view class="card-list">
      <view class="card">
        <text class="card-title">最近提交</text>
        <view v-if="loading" class="loading">加载中...</view>
        <view v-else-if="commits.length === 0" class="empty">暂无数据</view>
        <view v-else class="commit-list">
          <view v-for="commit in commits" :key="commit.id" class="commit-item">
            <view class="commit-repo">{{ commit.repo }}</view>
            <view class="commit-msg">{{ commit.message }}</view>
            <view class="commit-date">{{ commit.date }}</view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getRecentCommitsApi, type GithubCommitVO } from '@/api/github';

const commits = ref<GithubCommitVO[]>([]);
const loading = ref(true);

const fetchData = async () => {
  try {
    loading.value = true;
    commits.value = await getRecentCommitsApi(10);
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
.card-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}
.card-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  display: block;
}
.loading, .empty {
  text-align: center;
  color: #999;
  font-size: 28rpx;
  padding: 40rpx 0;
}
.commit-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.commit-item {
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #eee;
  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
}
.commit-repo {
  font-size: 28rpx;
  font-weight: 500;
  color: #2b70d4;
  margin-bottom: 8rpx;
}
.commit-msg {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 8rpx;
}
.commit-date {
  font-size: 24rpx;
  color: #999;
}
</style>
