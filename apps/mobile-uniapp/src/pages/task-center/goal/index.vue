<template>
  <view class="goal-container">
    <scroll-view scroll-y class="goal-list">
      <view
        v-for="goal in goals"
        :key="goal.id"
        class="goal-card"
        @click="onEditGoal(goal)"
        @longpress="onDeleteGoal(goal)"
      >
        <view class="goal-header">
          <text class="goal-title">{{ goal.title }}</text>
          <text :class="['goal-status', 'status-' + goal.status]">{{ getStatusText(goal.status) }}</text>
        </view>
        
        <view class="goal-meta">
          <text class="goal-type">{{ getTypeText(goal.type) }}</text>
          <text class="goal-date" v-if="goal.startDate || goal.endDate">
            {{ goal.startDate }} ~ {{ goal.endDate }}
          </text>
        </view>

        <view class="goal-progress">
          <view class="progress-info">
            <text class="progress-text">进度: {{ goal.progress }}%</text>
            <text class="progress-values" v-if="goal.targetValue">
              {{ goal.currentValue || 0 }} / {{ goal.targetValue }}
            </text>
          </view>
          <progress 
            :percent="goal.progress" 
            stroke-width="6" 
            :activeColor="getProgressColor(goal.progress)" 
            backgroundColor="#ebeef5" 
            border-radius="4"
          />
        </view>
      </view>

      <view class="empty-state" v-if="goals.length === 0">
        <text class="empty-text">暂无目标</text>
      </view>
    </scroll-view>

    <view class="fab" @click="onAddGoal">
      <uni-icons type="plusempty" size="24" color="#fff" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getGoalList, deleteGoals } from '@/api/goal';
import type { GoalEntity } from '@/api/goal';

const goals = ref<GoalEntity[]>([]);

onMounted(() => {
  fetchData();
});

async function fetchData() {
  try {
    const res: any = await getGoalList();
    const list = res?.items || res?.records || res?.list || (Array.isArray(res) ? res : []);
    if (list) {
      goals.value = list;
    }
  } catch (error) {
    console.error('Failed to fetch goal data', error);
  }
}

const onAddGoal = () => {
  uni.navigateTo({ url: '/pages/task-center/goal/edit' });
};

const onEditGoal = (goal: GoalEntity) => {
  uni.$emit('editGoal', goal);
  uni.navigateTo({ url: '/pages/task-center/goal/edit' });
};

const onDeleteGoal = (goal: GoalEntity) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除「${goal.title}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteGoals([Number(goal.id)]);
          uni.showToast({ title: '已删除', icon: 'success' });
          fetchData();
        } catch (e) {
          uni.showToast({ title: '删除失败', icon: 'none' });
        }
      }
    }
  });
};

function getTypeText(type: number) {
  const map: Record<number, string> = {
    1: '年度目标',
    2: '月度目标',
    3: '每日目标'
  };
  return map[type] || '其他';
}

function getStatusText(status: number) {
  const map: Record<number, string> = {
    0: '待开始',
    1: '进行中',
    2: '已完成',
    3: '已放弃'
  };
  return map[status] || '未知';
}

function getProgressColor(progress: number) {
  if (progress >= 100) return '#67c23a';
  if (progress > 50) return '#e6a23c';
  return '#409eff';
}
</script>

<style lang="scss" scoped>
.goal-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20rpx;
}

.goal-list {
  height: 100%;
}

.goal-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);

  .goal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16rpx;

    .goal-title {
      font-size: 32rpx;
      color: #333;
      font-weight: 500;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .goal-status {
      font-size: 24rpx;
      padding: 4rpx 12rpx;
      border-radius: 8rpx;
      margin-left: 16rpx;

      &.status-0 {
        color: #909399;
        background-color: #f4f4f5;
      }
      &.status-1 {
        color: #409eff;
        background-color: #ecf5ff;
      }
      &.status-2 {
        color: #67c23a;
        background-color: #f0f9eb;
      }
      &.status-3 {
        color: #f56c6c;
        background-color: #fef0f0;
      }
    }
  }

  .goal-meta {
    display: flex;
    align-items: center;
    margin-bottom: 20rpx;
    
    .goal-type {
      font-size: 24rpx;
      color: #e6a23c;
      background-color: #fdf6ec;
      padding: 4rpx 12rpx;
      border-radius: 8rpx;
      margin-right: 16rpx;
    }

    .goal-date {
      font-size: 24rpx;
      color: #999;
    }
  }

  .goal-progress {
    .progress-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8rpx;
      
      .progress-text {
        font-size: 24rpx;
        color: #666;
      }
      
      .progress-values {
        font-size: 24rpx;
        color: #999;
      }
    }
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
  position: fixed; right: 48rpx; bottom: 48rpx;
  width: 96rpx; height: 96rpx;
  background: linear-gradient(135deg, #ff5a5f, #ff7e82);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(255, 90, 95, 0.4);
  &:active { opacity: 0.8; transform: scale(0.95); }
}
</style>
