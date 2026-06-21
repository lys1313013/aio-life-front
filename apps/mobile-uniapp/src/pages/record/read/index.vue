<template>
  <view class="container">
    <view class="book-list" v-if="readList.length > 0">
      <view class="book-card" v-for="item in readList" :key="item.id" @click="onClickBook(item)">
        <image class="cover" :src="item.coverImg || '/static/logo.png'" mode="aspectFill" />
        <view class="info">
          <text class="title">{{ item.title }}</text>
          <text class="author">{{ item.author || '未知作者' }}</text>
          
          <view class="progress-box">
            <progress 
              :percent="getPercent(item)" 
              stroke-width="4" 
              activeColor="#4CAF50" 
              backgroundColor="#E0E0E0" 
            />
            <text class="progress-text">{{ getPercent(item) }}%</text>
          </view>
          
          <text class="status">{{ getStatusText(item.status) }}</text>
        </view>
      </view>
    </view>
    <view v-else class="empty">
      <text>暂无阅读记录</text>
    </view>

    <!-- FAB -->
    <uni-fab
      horizontal="right"
      vertical="bottom"
      :pattern="{ buttonColor: '#4CAF50' }"
      @fabClick="onAddRead"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getReadListApi, type ReadRecordVO } from '../../../api/read';

const readList = ref<ReadRecordVO[]>([]);

const loadReadList = async () => {
  try {
    const res = await getReadListApi({ current: 1, size: 50 });
    readList.value = res.records || res.items || res.records || res.list || (Array.isArray(res) ? res : []);
  } catch (e) {
    console.error('加载阅读记录失败', e);
  }
};

const getPercent = (item: ReadRecordVO) => {
  if (!item.totalProgress) return 0;
  const p = Math.floor((item.currentProgress / item.totalProgress) * 100);
  return p > 100 ? 100 : p;
};

const getStatusText = (status: number) => {
  switch (status) {
    case 0: return '未开始';
    case 1: return '阅读中';
    case 2: return '已读完';
    case 3: return '搁置';
    default: return '未知';
  }
};

const onClickBook = (item: ReadRecordVO) => {
  uni.showToast({ title: `查看: ${item.title}`, icon: 'none' });
};

const onAddRead = () => {
  uni.showToast({ title: '添加阅读记录', icon: 'none' });
};

onMounted(() => {
  loadReadList();
});
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20rpx;
  padding-bottom: 120rpx;
}
.book-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.book-card {
  display: flex;
  background-color: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05);
  
  .cover {
    width: 140rpx;
    height: 200rpx;
    border-radius: 8rpx;
    background-color: #eee;
    flex-shrink: 0;
  }
  
  .info {
    flex: 1;
    margin-left: 24rpx;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    
    .title {
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
      margin-bottom: 8rpx;
    }
    
    .author {
      font-size: 26rpx;
      color: #666;
      margin-bottom: 16rpx;
    }
    
    .progress-box {
      display: flex;
      align-items: center;
      gap: 16rpx;
      margin-bottom: 10rpx;
      
      progress {
        flex: 1;
      }
      
      .progress-text {
        font-size: 24rpx;
        color: #999;
        width: 70rpx;
        text-align: right;
      }
    }
    
    .status {
      font-size: 24rpx;
      color: #4CAF50;
      background-color: #E8F5E9;
      padding: 4rpx 12rpx;
      border-radius: 4rpx;
      align-self: flex-start;
    }
  }
}
.empty {
  padding: 100rpx 0;
  text-align: center;
  color: #999;
}
</style>
