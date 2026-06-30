<template>
  <view class="container">
    <view class="video-list" v-if="videoList.length > 0">
      <view class="video-card" v-for="item in videoList" :key="item.id" @click="onClickVideo(item)" @longpress="onDeleteVideo(item)">
        <image class="cover" :src="item.cover || '/static/logo.png'" mode="aspectFill" />
        <view class="info">
          <text class="title">{{ item.title }}</text>
          <text class="up-name">UP主: {{ item.owner?.name || '未知' }}</text>
          
          <view class="progress-box">
            <progress 
              :percent="item.progress || 0" 
              stroke-width="4" 
              activeColor="#fb7299" 
              backgroundColor="#E0E0E0" 
            />
            <text class="progress-text">{{ item.progress || 0 }}%</text>
          </view>
          
          <view class="bottom-row">
            <text class="status" :class="item.status">{{ getStatusText(item.status) }}</text>
            <text class="date" v-if="item.lastWatched">上次观看: {{ formatDate(item.lastWatched) }}</text>
          </view>
        </view>
      </view>
    </view>
    <view v-else class="empty">
      <text>暂无B站视频记录</text>
    </view>

    <!-- FAB -->
    <uni-fab
      horizontal="right"
      vertical="bottom"
      :pattern="{ buttonColor: '#fb7299' }"
      @fabClick="onAddVideo"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { query, deleteBilibiliVideo, type BilibiliVideo } from '../../../api/bilibili-video';

const videoList = ref<BilibiliVideo[]>([]);

const loadVideoList = async () => {
  try {
    const res = await query({ page: 1, pageSize: 50, condition: {} });
    videoList.value = res.items || res.records || res.list || (Array.isArray(res) ? res : []);
  } catch (e) {
    console.error('加载视频记录失败', e);
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'completed': return '已看完';
    case 'in-progress': return '观看中';
    case 'watched': return '看了一点';
    default: return '未知';
  }
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  return dateStr.split(' ')[0];
};

const onClickVideo = (item: BilibiliVideo) => {
  uni.$emit('editVideo', item);
  uni.navigateTo({ url: '/pages/record/videoWatch/edit' });
};

const onAddVideo = () => {
  uni.navigateTo({ url: '/pages/record/videoWatch/edit' });
};

const onDeleteVideo = (item: BilibiliVideo) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除「${item.title}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteBilibiliVideo(item.id!);
          uni.showToast({ title: '已删除', icon: 'success' });
          loadVideoList();
        } catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }); }
      }
    }
  });
};

onMounted(() => {
  loadVideoList();
});
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20rpx;
  padding-bottom: 120rpx;
}
.video-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.video-card {
  display: flex;
  background-color: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05);
  
  .cover {
    width: 240rpx;
    height: 150rpx;
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
      font-size: 28rpx;
      font-weight: bold;
      color: #333;
      margin-bottom: 8rpx;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
    }
    
    .up-name {
      font-size: 24rpx;
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
    
    .bottom-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .status {
        font-size: 22rpx;
        padding: 4rpx 12rpx;
        border-radius: 4rpx;
        
        &.completed {
          color: #4CAF50;
          background-color: #E8F5E9;
        }
        &.in-progress {
          color: #fb7299;
          background-color: #ffeeef;
        }
        &.watched {
          color: #2196F3;
          background-color: #E3F2FD;
        }
      }
      
      .date {
        font-size: 22rpx;
        color: #999;
      }
    }
  }
}
.empty {
  padding: 100rpx 0;
  text-align: center;
  color: #999;
}
</style>
