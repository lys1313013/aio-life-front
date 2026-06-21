<template>
  <view class="container">
    <view class="performance-list" v-if="performanceList.length > 0">
      <view class="performance-card" v-for="item in performanceList" :key="item.id" @click="onClickPerformance(item)">
        <view class="header">
          <text class="title">{{ item.title || item.name }}</text>
          <text class="score" :class="getScoreClass(item.score)">{{ item.score }} 分</text>
        </view>
        <view class="body">
          <text class="desc" v-if="item.description">{{ item.description }}</text>
          <view class="tags" v-if="item.category">
            <text class="tag">{{ item.category }}</text>
          </view>
        </view>
        <view class="footer">
          <text class="date">{{ item.date || item.createTime }}</text>
        </view>
      </view>
    </view>
    <view v-else class="empty">
      <text>暂无绩效/活动记录</text>
    </view>

    <!-- FAB -->
    <uni-fab
      horizontal="right"
      vertical="bottom"
      :pattern="{ buttonColor: '#00BCD4' }"
      @fabClick="onAddPerformance"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { query } from '../../../api/performance';

const performanceList = ref<any[]>([]);

const loadPerformanceList = async () => {
  try {
    const res = await query({ page: 1, pageSize: 50, condition: {} });
    performanceList.value = res.items || res.records || res.list || (Array.isArray(res) ? res : []);
  } catch (e) {
    console.error('加载绩效记录失败', e);
  }
};

const getScoreClass = (score: number) => {
  if (!score) return 'normal';
  if (score >= 90) return 'excellent';
  if (score >= 80) return 'good';
  if (score < 60) return 'poor';
  return 'normal';
};

const onClickPerformance = (item: any) => {
  uni.showToast({ title: `查看: ${item.title || item.name}`, icon: 'none' });
};

const onAddPerformance = () => {
  uni.showToast({ title: '添加绩效记录', icon: 'none' });
};

onMounted(() => {
  loadPerformanceList();
});
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20rpx;
  padding-bottom: 120rpx;
}

.performance-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.performance-card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16rpx;
    
    .title {
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
    }
    
    .score {
      font-size: 36rpx;
      font-weight: bold;
      
      &.excellent { color: #4CAF50; }
      &.good { color: #2196F3; }
      &.normal { color: #FF9800; }
      &.poor { color: #F44336; }
    }
  }
  
  .body {
    margin-bottom: 20rpx;
    
    .desc {
      font-size: 26rpx;
      color: #666;
      line-height: 1.5;
      display: block;
      margin-bottom: 12rpx;
    }
    
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 12rpx;
      
      .tag {
        font-size: 22rpx;
        color: #00BCD4;
        background-color: #E0F7FA;
        padding: 4rpx 12rpx;
        border-radius: 4rpx;
      }
    }
  }
  
  .footer {
    display: flex;
    justify-content: flex-end;
    border-top: 1rpx solid #f0f0f0;
    padding-top: 16rpx;
    
    .date {
      font-size: 24rpx;
      color: #999;
    }
  }
}

.empty {
  padding: 100rpx 0;
  text-align: center;
  color: #999;
}
</style>
