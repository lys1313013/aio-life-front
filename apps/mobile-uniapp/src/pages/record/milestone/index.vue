<template>
  <view class="container">
    <view class="timeline" v-if="milestoneList.length > 0">
      <view class="timeline-item" v-for="(item, index) in milestoneList" :key="item.id">
        <view class="timeline-line" v-if="index !== milestoneList.length - 1"></view>
        <view class="timeline-dot"></view>
        
        <view class="timeline-content" @click="onClickMilestone(item)">
          <view class="date">{{ item.date }}</view>
          <view class="card">
            <text class="title">{{ item.title }}</text>
            <text class="type" v-if="item.type">{{ item.type }}</text>
            <text class="desc" v-if="item.description">{{ item.description }}</text>
            
            <view class="tags" v-if="item.tags">
              <text class="tag" v-for="tag in parseTags(item.tags)" :key="tag">{{ tag }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
    <view v-else class="empty">
      <text>暂无里程碑记录</text>
    </view>

    <!-- FAB -->
    <uni-fab
      horizontal="right"
      vertical="bottom"
      :pattern="{ buttonColor: '#9c27b0' }"
      @fabClick="onAddMilestone"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { queryMilestone, type MilestoneEntity } from '../../../api/milestone';

const milestoneList = ref<MilestoneEntity[]>([]);

const loadMilestoneList = async () => {
  try {
    const res = await queryMilestone();
    // 按照日期倒序排列
    milestoneList.value = (res || []).sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  } catch (e) {
    console.error('加载里程碑失败', e);
  }
};

const parseTags = (tagsStr: string) => {
  try {
    return JSON.parse(tagsStr) || [];
  } catch {
    return tagsStr ? tagsStr.split(',') : [];
  }
};

const onClickMilestone = (item: MilestoneEntity) => {
  uni.showToast({ title: `查看: ${item.title}`, icon: 'none' });
};

const onAddMilestone = () => {
  uni.showToast({ title: '添加里程碑', icon: 'none' });
};

onMounted(() => {
  loadMilestoneList();
});
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 40rpx 30rpx;
  padding-bottom: 120rpx;
}

.timeline {
  position: relative;
  display: flex;
  flex-direction: column;
}

.timeline-item {
  position: relative;
  padding-left: 60rpx;
  padding-bottom: 40rpx;
  
  .timeline-line {
    position: absolute;
    left: 20rpx;
    top: 40rpx;
    bottom: -10rpx;
    width: 2rpx;
    background-color: #e0e0e0;
  }
  
  .timeline-dot {
    position: absolute;
    left: 12rpx;
    top: 10rpx;
    width: 18rpx;
    height: 18rpx;
    border-radius: 50%;
    background-color: #9c27b0;
    border: 4rpx solid #e1bee7;
  }
  
  .timeline-content {
    .date {
      font-size: 24rpx;
      color: #9c27b0;
      font-weight: bold;
      margin-bottom: 12rpx;
    }
    
    .card {
      background-color: #fff;
      border-radius: 16rpx;
      padding: 24rpx;
      box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
      
      .title {
        display: block;
        font-size: 32rpx;
        font-weight: bold;
        color: #333;
        margin-bottom: 12rpx;
      }
      
      .type {
        display: inline-block;
        font-size: 22rpx;
        color: #fff;
        background-color: #9c27b0;
        padding: 4rpx 12rpx;
        border-radius: 4rpx;
        margin-bottom: 12rpx;
      }
      
      .desc {
        display: block;
        font-size: 26rpx;
        color: #666;
        line-height: 1.5;
        margin-bottom: 16rpx;
      }
      
      .tags {
        display: flex;
        flex-wrap: wrap;
        gap: 12rpx;
        
        .tag {
          font-size: 22rpx;
          color: #9c27b0;
          background-color: #f3e5f5;
          padding: 4rpx 12rpx;
          border-radius: 20rpx;
        }
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
