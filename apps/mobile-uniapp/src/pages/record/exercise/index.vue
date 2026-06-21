<template>
  <view class="exercise-page">
    <view class="header">
      <text class="title">运动记录</text>
      <text class="subtitle">共 {{ total }} 条记录</text>
    </view>

    <scroll-view
      scroll-y
      class="record-list"
      @scrolltolower="loadMore"
      :refresher-enabled="true"
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="records.length === 0" class="empty-state">
        <uni-icons type="info" size="48" color="#ccc" />
        <text class="empty-text">暂无运动记录</text>
      </view>

      <view v-for="item in records" :key="item.id" class="record-card">
        <view class="card-header">
          <view class="type-badge">
            <uni-icons type="star-filled" size="16" color="#fff" />
            <text class="type-text">{{ getExerciseTypeLabel(item.exerciseTypeId) }}</text>
          </view>
          <text class="date-text">{{ formatDate(item.exerciseDate) }}</text>
        </view>
        <view class="card-body">
          <view class="info-item">
            <text class="label">数量/时长</text>
            <text class="value">{{ item.exerciseCount || item.duration || 0 }}</text>
          </view>
          <view class="info-item" v-if="item.calories">
            <text class="label">消耗</text>
            <text class="value highlight">{{ item.calories || 0 }} <text class="unit">千卡</text></text>
          </view>
        </view>
        <view v-if="item.remark" class="card-footer">
          <text class="remark">{{ item.remark }}</text>
        </view>
      </view>
      
      <view class="loading-more" v-if="records.length > 0">
        <text class="loading-text">{{ hasMore ? '加载中...' : '没有更多了' }}</text>
      </view>
    </scroll-view>

    <!-- FAB -->
    <view class="fab" @click="handleAdd">
      <uni-icons type="plusempty" size="24" color="#fff" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { query } from '@/api/exercise';
import { getByDictType } from '@/api/userDictType';

interface ExerciseRecord {
  id: string;
  exerciseType: string;
  exerciseTypeId: string;
  exerciseCount: number;
  exerciseDate: string;
  duration: number;
  calories: number;
  remark: string;
}

const records = ref<ExerciseRecord[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);
const hasMore = ref(true);
const isRefreshing = ref(false);
const dictOptions = ref<Array<{ id: number; label: string; value: string }>>([]);

const loadExerciseTypes = async () => {
  try {
    const res: any = await getByDictType('exercise_type');
    if (res && res.dictDetailList) {
      dictOptions.value = res.dictDetailList.map((item: any) => ({
        id: Number(item.id),
        label: item.dictLabel || item.label,
        value: String(item.id),
      }));
    }
  } catch (error) {
    console.error('加载运动类型失败:', error);
  }
};

const getExerciseTypeLabel = (typeId: string) => {
  const option = dictOptions.value.find((item) => item.value === typeId);
  return option ? option.label : '未知运动';
};

const loadData = async (isLoadMore = false) => {
  if (!isLoadMore) {
    currentPage.value = 1;
    hasMore.value = true;
  }
  
  if (!hasMore.value) return;

  try {
    const res: any = await query({
      current: currentPage.value,
      size: pageSize.value,
      condition: {},
    });
    
    const list = res.records || res.items || res.data || res.list || (Array.isArray(res) ? res : []);
    const totalCount = res.total || 0;
    
    if (isLoadMore) {
      records.value.push(...list);
    } else {
      records.value = list;
    }
    
    total.value = totalCount;
    hasMore.value = records.value.length < totalCount;
    
    if (hasMore.value) {
      currentPage.value++;
    }
  } catch (error) {
    console.error('获取运动记录失败:', error);
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    isRefreshing.value = false;
  }
};

const onRefresh = () => {
  isRefreshing.value = true;
  loadData();
};

const loadMore = () => {
  loadData(true);
};

const handleAdd = () => {
  uni.showToast({ title: '添加功能开发中', icon: 'none' });
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

onMounted(async () => {
  await loadExerciseTypes();
  loadData();
});
</script>

<style lang="scss" scoped>
.exercise-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f7fa;
}

.header {
  padding: 32rpx;
  background-color: #fff;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  
  .title {
    font-size: 36rpx;
    font-weight: bold;
    color: #333;
  }
  
  .subtitle {
    font-size: 24rpx;
    color: #999;
  }
}

.record-list {
  flex: 1;
  padding: 24rpx;
  box-sizing: border-box;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 120rpx;
  
  .empty-text {
    margin-top: 24rpx;
    font-size: 28rpx;
    color: #999;
  }
}

.record-card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
    
    .type-badge {
      display: flex;
      align-items: center;
      gap: 8rpx;
      background: linear-gradient(135deg, #2979ff, #4facfe);
      padding: 6rpx 16rpx;
      border-radius: 32rpx;
      
      .type-text {
        color: #fff;
        font-size: 24rpx;
        font-weight: 500;
      }
    }
    
    .date-text {
      font-size: 24rpx;
      color: #999;
    }
  }
  
  .card-body {
    display: flex;
    gap: 48rpx;
    padding: 16rpx 0;
    border-bottom: 1rpx solid #f0f0f0;
    
    .info-item {
      display: flex;
      flex-direction: column;
      gap: 8rpx;
      
      .label {
        font-size: 24rpx;
        color: #666;
      }
      
      .value {
        font-size: 32rpx;
        font-weight: bold;
        color: #333;
        
        &.highlight {
          color: #ff9800;
        }
        
        .unit {
          font-size: 20rpx;
          font-weight: normal;
          color: #999;
          margin-left: 4rpx;
        }
      }
    }
  }
  
  .card-footer {
    padding-top: 16rpx;
    
    .remark {
      font-size: 24rpx;
      color: #666;
    }
  }
}

.loading-more {
  text-align: center;
  padding: 24rpx 0;
  
  .loading-text {
    font-size: 24rpx;
    color: #999;
  }
}

.fab {
  position: fixed;
  right: 48rpx;
  bottom: 48rpx;
  width: 96rpx;
  height: 96rpx;
  background: linear-gradient(135deg, #2979ff, #4facfe);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(41, 121, 255, 0.4);
  
  &:active {
    opacity: 0.8;
    transform: scale(0.95);
  }
}
</style>
