<template>
  <view class="container">
    <view class="header">
      <text class="title">MCP 工具列表</text>
    </view>
    <view class="list">
      <view v-if="loading" class="loading">加载中...</view>
      <view v-else-if="list.length === 0" class="empty">暂无工具数据</view>
      <view v-else class="list-item" v-for="(item, index) in list" :key="index">
        <view class="item-content">
          <text class="item-name">{{ item.name }}</text>
          <text class="item-desc">{{ item.description || '暂无描述' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getMcpToolsApi, type McpToolInfo } from '@/api/mcp';

const list = ref<McpToolInfo[]>([]);
const loading = ref(true);

const fetchList = async () => {
  try {
    loading.value = true;
    const res = await getMcpToolsApi();
    list.value = res || [];
  } catch (error) {
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
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
  padding-bottom: 40rpx;
}
.list-item {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}
.item-content {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.item-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #2b70d4;
}
.item-desc {
  font-size: 26rpx;
  color: #666;
  line-height: 1.5;
}
</style>
