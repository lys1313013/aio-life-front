<template>
  <view class="import-page">
    <view class="content">
      <view class="icon-wrap">
        <text class="icon">💻</text>
      </view>
      <text class="title">账单导入</text>
      <text class="desc">请前往 PC 端进行账单导入操作</text>
      <text class="sub-desc">移动端暂不支持导入微信/支付宝账单</text>
    </view>
  </view>
</template>

<script setup lang="ts">
</script>

<style lang="scss" scoped>
.import-page {
  min-height: 100vh;
  background-color: #f5f7fa;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40rpx;
}

.content {
  background-color: #fff;
  border-radius: 32rpx;
  padding: 80rpx 40rpx;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.05);

  .icon-wrap {
    width: 160rpx;
    height: 160rpx;
    background-color: #f0f5ff;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 40rpx;

    .icon {
      font-size: 80rpx;
    }
  }

  .title {
    font-size: 36rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 20rpx;
  }

  .desc {
    font-size: 28rpx;
    color: #666;
    margin-bottom: 16rpx;
  }

  .sub-desc {
    font-size: 24rpx;
    color: #999;
  }
}
</style>
