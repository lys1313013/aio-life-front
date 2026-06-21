<template>
  <view class="container">
    <view class="timeline" v-if="thoughts.length > 0">
      <view class="thought-item" v-for="item in thoughts" :key="item.id">
        <view class="time-header">
          <text class="time">{{ formatTime(item.createTime) }}</text>
        </view>
        <view class="bubble">
          <text class="content">{{ item.content }}</text>
        </view>
      </view>
    </view>
    <view v-else class="empty">
      <text>暂无闪念，快记录下你的灵感吧</text>
    </view>

    <!-- FAB -->
    <uni-fab
      horizontal="right"
      vertical="bottom"
      :pattern="{ buttonColor: '#FF9800' }"
      @fabClick="onAddThought"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { queryThoughts } from '../../../api/think';

const thoughts = ref<any[]>([]);

const loadThoughts = async () => {
  try {
    const res = await queryThoughts({ page: 1, pageSize: 50 , condition: {} });
    thoughts.value = res.items || res.records || res.list || (Array.isArray(res) ? res : []);
  } catch (e) {
    console.error('加载闪念失败', e);
  }
};

const formatTime = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

const onAddThought = () => {
  uni.showToast({ title: '添加闪念', icon: 'none' });
};

onMounted(() => {
  loadThoughts();
});
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 30rpx 20rpx 120rpx;
}
.timeline {
  display: flex;
  flex-direction: column;
  gap: 30rpx;
}
.thought-item {
  display: flex;
  flex-direction: column;
  .time-header {
    margin-bottom: 10rpx;
    padding-left: 10rpx;
    .time {
      font-size: 24rpx;
      color: #888;
    }
  }
  .bubble {
    background-color: #fff;
    border-radius: 16rpx;
    padding: 24rpx;
    box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
    .content {
      font-size: 28rpx;
      color: #333;
      line-height: 1.6;
      word-break: break-all;
    }
  }
}
.empty {
  padding: 100rpx 0;
  text-align: center;
  color: #999;
}
</style>
