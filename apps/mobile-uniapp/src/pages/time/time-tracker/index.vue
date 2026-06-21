<template>
  <view class="time-tracker-container">
    <view class="header">
      <picker mode="date" :value="currentDate" @change="onDateChange">
        <view class="date-picker">
          <text class="date-text">{{ currentDate }}</text>
          <uni-icons type="calendar" size="18" color="#666" />
        </view>
      </picker>
    </view>

    <scroll-view scroll-y class="record-list">
      <view
        v-for="record in records"
        :key="record.id"
        class="record-card"
      >
        <view class="record-header">
          <text class="record-title">{{ record.title }}</text>
          <text class="record-duration">{{ formatDuration(record.duration || (record.endTime >= record.startTime ? record.endTime - record.startTime : record.endTime - record.startTime + 1440)) }}</text>
        </view>
        <view class="record-time">
          <text>{{ formatTime(record.startTime) }} - {{ formatTime(record.endTime) }}</text>
        </view>
        <view class="record-desc" v-if="record.description">
          <text>{{ record.description }}</text>
        </view>
      </view>

      <view class="empty-state" v-if="records.length === 0">
        <text class="empty-text">今日暂无记录</text>
      </view>
    </scroll-view>

    <view class="fab" @click="handleAdd">
      <uni-icons type="plusempty" size="24" color="#fff" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { queryTimeTrackerByDate } from '@/api/time-tracker';
import type { TimeRecordEntity } from '@/api/time-tracker';

const currentDate = ref('');
const records = ref<TimeRecordEntity[]>([]);

onMounted(() => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  currentDate.value = `${yyyy}-${mm}-${dd}`;
});

onShow(() => {
  if (currentDate.value) {
    fetchData();
  }
});

async function fetchData() {
  try {
    const res = await queryTimeTrackerByDate(currentDate.value);
    console.log('fetchData res:', JSON.stringify(res));
    if (res && res.items) {
      records.value = res.items;
    } else if (res && res.records) {
      records.value = res.records;
    } else if (res && res.list) {
      records.value = res.list;
    } else if (Array.isArray(res)) {
      records.value = res;
    } else {
      records.value = [];
    }
    console.log('records.value length:', records.value.length);
  } catch (error) {
    console.error('Failed to fetch time tracker data', error);
  }
}

function onDateChange(e: any) {
  currentDate.value = e.detail.value;
  fetchData();
}

function formatTime(minutes: number) {
  if (typeof minutes !== 'number') return '';
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mm = String(minutes % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function formatDuration(minutes: number) {
  if (!minutes) return '0分钟';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) {
    return `${h}小时${m > 0 ? m + '分钟' : ''}`;
  }
  return `${m}分钟`;
}

function handleAdd() {
  uni.navigateTo({ url: '/pages/time/time-tracker/edit' });
}
</script>

<style lang="scss" scoped>
.time-tracker-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.header {
  background-color: #fff;
  padding: 20rpx 30rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
  z-index: 10;

  .date-picker {
    display: flex;
    align-items: center;
    background-color: #f5f7fa;
    padding: 12rpx 30rpx;
    border-radius: 30rpx;

    .date-text {
      font-size: 28rpx;
      color: #333;
      margin-right: 12rpx;
      font-weight: 500;
    }
  }
}

.record-list {
  flex: 1;
  padding: 20rpx;
  height: calc(100vh - 120rpx);
}

.record-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
  border-left: 8rpx solid #007AFF;

  .record-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12rpx;

    .record-title {
      font-size: 32rpx;
      color: #333;
      font-weight: 500;
    }

    .record-duration {
      font-size: 28rpx;
      color: #007AFF;
      font-weight: bold;
    }
  }

  .record-time {
    font-size: 24rpx;
    color: #666;
    margin-bottom: 8rpx;
  }

  .record-desc {
    font-size: 24rpx;
    color: #999;
    background-color: #f9f9f9;
    padding: 12rpx;
    border-radius: 8rpx;
    margin-top: 12rpx;
  }
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400rpx;
  .empty-text {
    color: #999;
    font-size: 28rpx;
  }
}

.fab {
  position: fixed;
  right: 40rpx;
  bottom: 40rpx;
  width: 100rpx;
  height: 100rpx;
  background-color: #007AFF;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4rpx 16rpx rgba(0, 122, 255, 0.4);
  z-index: 99;
}
</style>
