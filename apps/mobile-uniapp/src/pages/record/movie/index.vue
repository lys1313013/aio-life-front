<template>
  <view class="container">
    <view class="movie-list" v-if="movieList.length > 0">
      <view class="movie-card" v-for="item in movieList" :key="item.id" @click="onClickMovie(item)">
        <image class="cover" :src="item.fileId ? getFilePreviewUrl(item.fileId) : '/static/logo.png'" mode="aspectFill" />
        <view class="info">
          <text class="title">{{ item.title }}</text>
          <text class="director">{{ item.director || '未知导演' }}</text>
          
          <view class="progress-box">
            <progress 
              :percent="getPercent(item)" 
              stroke-width="4" 
              activeColor="#ff9800" 
              backgroundColor="#E0E0E0" 
            />
            <text class="progress-text">{{ getPercent(item) }}%</text>
          </view>
          
          <view class="bottom-row">
            <text class="status">{{ getStatusText(item.status) }}</text>
            <text class="date" v-if="item.startTime">{{ formatDate(item.startTime) }}</text>
          </view>
        </view>
      </view>
    </view>
    <view v-else class="empty">
      <text>暂无观影记录</text>
    </view>

    <!-- FAB -->
    <uni-fab
      horizontal="right"
      vertical="bottom"
      :pattern="{ buttonColor: '#ff9800' }"
      @fabClick="onAddMovie"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getFilePreviewUrl } from '@/utils/file';
import { MovieApi } from '../../../api/movie';

const movieList = ref<MovieApi.MovieVO[]>([]);

const loadMovieList = async () => {
  try {
    const res = await MovieApi.pageList({ current: 1, size: 50 });
    movieList.value = res.records || res.items || res.records || res.list || (Array.isArray(res) ? res : []);
  } catch (e) {
    console.error('加载观影记录失败', e);
  }
};

const getPercent = (item: MovieApi.MovieVO) => {
  if (!item.totalProgress) return 0;
  const p = Math.floor((item.currentProgress / item.totalProgress) * 100);
  return p > 100 ? 100 : p;
};

const getStatusText = (status: number) => {
  switch (status) {
    case 0: return '想看';
    case 1: return '在看';
    case 2: return '看过';
    default: return '未知';
  }
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  return dateStr.split(' ')[0];
};

const onClickMovie = (item: MovieApi.MovieVO) => {
  uni.showToast({ title: `查看: ${item.title}`, icon: 'none' });
};

const onAddMovie = () => {
  uni.showToast({ title: '添加观影记录', icon: 'none' });
};

onMounted(() => {
  loadMovieList();
});
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20rpx;
  padding-bottom: 120rpx;
}
.movie-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.movie-card {
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
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
    }
    
    .director {
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
    
    .bottom-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .status {
        font-size: 24rpx;
        color: #ff9800;
        background-color: #fff3e0;
        padding: 4rpx 12rpx;
        border-radius: 4rpx;
      }
      
      .date {
        font-size: 24rpx;
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
