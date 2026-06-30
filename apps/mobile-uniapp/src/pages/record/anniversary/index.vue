<template>
  <view class="container">
    <view class="anniversary-list" v-if="anniversaryList.length > 0">
      <view
        class="anniversary-card"
        v-for="item in anniversaryList"
        :key="item.id"
        @click="onClickAnniversary(item)"
        @longpress="onDeleteAnniversary(item)"
        :style="{ background: item.color || 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)' }"
      >
        <view class="icon-wrap">
          <text class="icon">{{ item.icon || '🎉' }}</text>
        </view>
        <view class="info">
          <text class="title">{{ item.title }}</text>
          <text class="date">{{ item.targetDate }}</text>
          <text class="note" v-if="item.note">{{ item.note }}</text>
        </view>
        <view class="countdown-box">
          <text class="days">{{ calculateDays(item.targetDate) }}</text>
          <text class="label">天</text>
        </view>
      </view>
    </view>
    <view v-else class="empty">
      <text>暂无纪念日记录</text>
    </view>

    <!-- FAB -->
    <uni-fab
      horizontal="right"
      vertical="bottom"
      :pattern="{ buttonColor: '#E91E63' }"
      @fabClick="onAddAnniversary"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getAnniversaryRecords, deleteAnniversaryRecords, type AnniversaryRecord } from '../../../api/anniversary';

const anniversaryList = ref<AnniversaryRecord[]>([]);

const loadAnniversaryList = async () => {
  try {
    const res = await getAnniversaryRecords();
    anniversaryList.value = res || [];
  } catch (e) {
    console.error('加载纪念日失败', e);
  }
};

const calculateDays = (targetDate: string) => {
  if (!targetDate) return 0;
  const target = new Date(targetDate).getTime();
  const now = new Date().getTime();
  const diff = target - now;
  return Math.abs(Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

const onClickAnniversary = (item: AnniversaryRecord) => {
  uni.$emit('editAnniversary', item);
  uni.navigateTo({ url: '/pages/record/anniversary/edit' });
};

const onAddAnniversary = () => {
  uni.navigateTo({ url: '/pages/record/anniversary/edit' });
};

const onDeleteAnniversary = (item: AnniversaryRecord) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除「${item.title}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteAnniversaryRecords([item.id!]);
          uni.showToast({ title: '已删除', icon: 'success' });
          loadAnniversaryList();
        } catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }); }
      }
    }
  });
};

onMounted(() => {
  loadAnniversaryList();
});
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20rpx;
  padding-bottom: 120rpx;
}
.anniversary-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.anniversary-card {
  display: flex;
  align-items: center;
  border-radius: 20rpx;
  padding: 30rpx;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.08);
  
  .icon-wrap {
    width: 80rpx;
    height: 80rpx;
    background-color: rgba(255, 255, 255, 0.5);
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-right: 24rpx;
    flex-shrink: 0;
    
    .icon {
      font-size: 40rpx;
    }
  }
  
  .info {
    flex: 1;
    display: flex;
    flex-direction: column;
    
    .title {
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
      margin-bottom: 8rpx;
    }
    
    .date {
      font-size: 24rpx;
      color: #666;
      margin-bottom: 4rpx;
    }
    
    .note {
      font-size: 24rpx;
      color: #888;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 1;
      overflow: hidden;
    }
  }
  
  .countdown-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 100rpx;
    background-color: rgba(255, 255, 255, 0.7);
    padding: 12rpx 20rpx;
    border-radius: 16rpx;
    
    .days {
      font-size: 40rpx;
      font-weight: bold;
      color: #E91E63;
      line-height: 1.2;
    }
    
    .label {
      font-size: 22rpx;
      color: #666;
    }
  }
}
.empty {
  padding: 100rpx 0;
  text-align: center;
  color: #999;
}
</style>
