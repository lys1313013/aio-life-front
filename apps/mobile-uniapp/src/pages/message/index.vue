<template>
  <view class="container">
    <view class="header">
      <text class="title">消息</text>
    </view>
    <view class="message-list">
      <view class="empty-state">
        <text>暂无新消息</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
// 消息逻辑
</script>

<style lang="scss" scoped>
.container {
  padding: 32rpx;
  background-color: #f8f8f8;
  min-height: 100vh;
}
.header {
  margin-bottom: 32rpx;
  .title {
    font-size: 40rpx;
    font-weight: bold;
    color: #333;
  }
}
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400rpx;
  text {
    color: #999;
    font-size: 28rpx;
  }
}
</style>
