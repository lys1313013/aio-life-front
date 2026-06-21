<template>
  <view class="finance-dashboard">
    <view class="header-card">
      <view class="title">财务概览</view>
      <view class="balance">
        <text class="label">净资产</text>
        <text class="amount">¥ {{ (totalIncome - totalExpense).toFixed(2) }}</text>
      </view>
      <view class="stats-row">
        <view class="stat-item">
          <text class="stat-label">总收入</text>
          <text class="stat-amount income">+¥{{ totalIncome.toFixed(2) }}</text>
        </view>
        <view class="stat-item">
          <text class="stat-label">总支出</text>
          <text class="stat-amount expense">-¥{{ totalExpense.toFixed(2) }}</text>
        </view>
      </view>
    </view>

    <view class="chart-section">
      <view class="section-title">收支对比 (近6个月)</view>
      <view class="bar-chart">
        <view class="bar-group" v-for="(item, index) in monthlyData" :key="index">
          <view class="bars">
            <view class="bar income-bar" :style="{ height: getBarHeight(item.income) }"></view>
            <view class="bar expense-bar" :style="{ height: getBarHeight(item.expense) }"></view>
          </view>
          <text class="month-label">{{ item.month }}月</text>
        </view>
      </view>
    </view>

    <view class="recent-transactions">
      <view class="section-title">近期动态</view>
      <view class="empty-state">
        <text>暂无近期交易</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { statisticsByMonth as expenseStat } from '@/api/expense';
import { statisticsByMonth as incomeStat } from '@/api/income';

const totalIncome = ref(0.00);
const totalExpense = ref(0.00);
const maxAmount = ref(1);

const monthlyData = ref<Array<{month: string, income: number, expense: number}>>([]);

const getBarHeight = (amount: number) => {
  return `${(amount / maxAmount.value) * 100}%`;
};

const loadData = async () => {
  try {
    const year = new Date().getFullYear().toString();
    const [expRes, incRes] = await Promise.all([
      expenseStat({ year }),
      incomeStat({ year })
    ]);
    
    // Calculate total
    let tInc = 0;
    let tExp = 0;
    
    // Group by month
    const map = new Map<string, { income: number, expense: number }>();
    
    // Initialize 1-12 months
    for (let i = 1; i <= 12; i++) {
      map.set(i.toString(), { income: 0, expense: 0 });
    }
    
    if (expRes && Array.isArray(expRes)) {
      expRes.forEach((item: any) => {
        if (item.month) {
          const m = parseInt(item.month).toString();
          const monthTotal = item.detail ? item.detail.reduce((sum: number, d: any) => sum + (d.amt || 0), 0) : (item.amount || 0);
          if (map.has(m)) map.get(m)!.expense = monthTotal;
          tExp += monthTotal;
        }
      });
    }
    
    if (incRes && Array.isArray(incRes)) {
      incRes.forEach((item: any) => {
        if (item.month) {
          const m = parseInt(item.month).toString();
          const monthTotal = item.detail ? item.detail.reduce((sum: number, d: any) => sum + (d.amt || 0), 0) : (item.amount || 0);
          if (map.has(m)) map.get(m)!.income = monthTotal;
          tInc += monthTotal;
        }
      });
    }
    
    totalIncome.value = tInc;
    totalExpense.value = tExp;
    
    // Get last 6 months
    const currentMonth = new Date().getMonth() + 1;
    const last6 = [];
    let localMax = 1;
    for (let i = 5; i >= 0; i--) {
      let m = currentMonth - i;
      if (m <= 0) m += 12;
      const data = map.get(m.toString()) || { income: 0, expense: 0 };
      if (data.income > localMax) localMax = data.income;
      if (data.expense > localMax) localMax = data.expense;
      last6.push({ month: m.toString(), ...data });
    }
    
    maxAmount.value = localMax;
    monthlyData.value = last6;
    
  } catch (error) {
    console.error('Failed to load finance stats:', error);
  }
};

onMounted(() => {
  loadData();
});
</script>

<style lang="scss" scoped>
.finance-dashboard {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding: 30rpx;
}

.header-card {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-radius: 24rpx;
  padding: 40rpx;
  color: #ffffff;
  box-shadow: 0 10rpx 30rpx rgba(37, 99, 235, 0.2);
  margin-bottom: 40rpx;

  .title {
    font-size: 28rpx;
    opacity: 0.9;
    margin-bottom: 20rpx;
  }

  .balance {
    margin-bottom: 40rpx;

    .label {
      display: block;
      font-size: 24rpx;
      opacity: 0.8;
      margin-bottom: 10rpx;
    }

    .amount {
      font-size: 64rpx;
      font-weight: bold;
    }
  }

  .stats-row {
    display: flex;
    justify-content: space-between;
    border-top: 1rpx solid rgba(255, 255, 255, 0.2);
    padding-top: 30rpx;

    .stat-item {
      flex: 1;

      .stat-label {
        display: block;
        font-size: 24rpx;
        opacity: 0.8;
        margin-bottom: 10rpx;
      }

      .stat-amount {
        font-size: 32rpx;
        font-weight: 600;

        &.income {
          color: #a7f3d0;
        }

        &.expense {
          color: #fecaca;
        }
      }
    }
  }
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 30rpx;
}

.chart-section {
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 30rpx;
  margin-bottom: 40rpx;

  .bar-chart {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    height: 300rpx;
    padding-top: 20rpx;

    .bar-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
      width: 60rpx;

      .bars {
        display: flex;
        align-items: flex-end;
        height: 240rpx;
        width: 100%;
        gap: 4rpx;

        .bar {
          flex: 1;
          border-radius: 6rpx 6rpx 0 0;
          min-height: 4rpx;
          transition: height 0.3s ease;
        }

        .income-bar {
          background-color: #10b981;
        }

        .expense-bar {
          background-color: #ef4444;
        }
      }

      .month-label {
        font-size: 22rpx;
        color: #666;
        margin-top: 20rpx;
      }
    }
  }
}

.recent-transactions {
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 30rpx;

  .empty-state {
    padding: 60rpx 0;
    text-align: center;
    color: #999;
    font-size: 28rpx;
  }
}
</style>
