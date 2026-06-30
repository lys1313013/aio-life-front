<template>
  <view class="expense-page">
    <view class="total-section">
      <text class="label">本月总支出</text>
      <text class="amount">¥ {{ totalAmount.toFixed(2) }}</text>
    </view>

    <view class="list-container">
      <view v-if="expenseList.length === 0" class="empty-state">
        <text>暂无支出记录</text>
      </view>
      <view v-else class="expense-list">
        <view class="expense-item" v-for="item in expenseList" :key="item.id" @click="handleEdit(item)" @longpress="handleDelete(item)">
          <view class="item-left">
            <view class="category-icon">
              <text class="icon-text">{{ (item.counterparty || item.expDesc || item.category || '支').substring(0,1) }}</text>
            </view>
            <view class="info">
              <text class="title">{{ item.counterparty || item.expDesc || item.category || '未分类' }}</text>
              <text class="date">{{ item.expTime || item.date }}</text>
            </view>
          </view>
          <view class="item-right">
            <text class="amount">- {{ (item.amt || item.transactionAmt || item.amount || 0).toFixed(2) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- FAB for adding expense -->
    <uni-fab
      ref="fab"
      :pattern="fabPattern"
      :content="fabContent"
      horizontal="right"
      vertical="bottom"
      direction="horizontal"
      @trigger="triggerFab"
      @fabClick="fabClick"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { query, deleteData } from '@/api/expense';

const expenseList = ref<any[]>([]);
const totalAmount = ref(0);

const fabPattern = {
  color: '#7A7E83',
  backgroundColor: '#fff',
  selectedColor: '#007AFF',
  buttonColor: '#ef4444',
  iconColor: '#fff'
};

const fabContent = [
  {
    iconPath: '/static/add.png',
    selectedIconPath: '/static/add-active.png',
    text: '记一笔',
    active: false
  }
];

const loadData = async () => {
  try {
    const res = await query({ pageNum: 1, pageSize: 50, condition: {} });
    const list = res?.list || res?.records || res?.items || (Array.isArray(res) ? res : []);
    if (list.length > 0) {
      expenseList.value = list;
      totalAmount.value = expenseList.value.reduce((sum, item) => sum + (item.amt || item.transactionAmt || item.amount || 0), 0);
    } else {
      expenseList.value = [];
      totalAmount.value = 0;
    }
  } catch (e) {
    console.error('Failed to load expense:', e);
    expenseList.value = [];
    totalAmount.value = 0;
  }
};

const triggerFab = (e: any) => {
  uni.navigateTo({ url: '/pages/finance/expense/edit' });
};

const fabClick = () => {
  uni.navigateTo({ url: '/pages/finance/expense/edit' });
};

const handleEdit = (item: any) => {
  uni.$emit('editExpense', item);
  uni.navigateTo({ url: '/pages/finance/expense/edit' });
};

const handleDelete = (item: any) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除这笔支出吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteData({ id: item.id });
          uni.showToast({ title: '已删除', icon: 'success' });
          loadData();
        } catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }); }
      }
    }
  });
};

onMounted(() => {
  loadData();
});
</script>

<style lang="scss" scoped>
.expense-page {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding-bottom: 120rpx;
}

.total-section {
  background-color: #ef4444;
  padding: 60rpx 40rpx;
  color: #fff;
  text-align: center;

  .label {
    display: block;
    font-size: 28rpx;
    opacity: 0.9;
    margin-bottom: 20rpx;
  }

  .amount {
    font-size: 72rpx;
    font-weight: bold;
  }
}

.list-container {
  padding: 30rpx;
  margin-top: -30rpx;
}

.empty-state {
  background-color: #fff;
  border-radius: 24rpx;
  padding: 100rpx 0;
  text-align: center;
  color: #999;
  font-size: 28rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
}

.expense-list {
  background-color: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);

  .expense-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 30rpx;
    border-bottom: 1rpx solid #f0f0f0;

    &:last-child {
      border-bottom: none;
    }

    .item-left {
      display: flex;
      align-items: center;

      .category-icon {
        width: 80rpx;
        height: 80rpx;
        background-color: rgba(239, 68, 68, 0.1);
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
        margin-right: 24rpx;

        .icon-text {
          color: #ef4444;
          font-size: 32rpx;
          font-weight: bold;
        }
      }

      .info {
        display: flex;
        flex-direction: column;

        .title {
          font-size: 30rpx;
          color: #333;
          font-weight: 500;
          margin-bottom: 8rpx;
        }

        .date {
          font-size: 24rpx;
          color: #999;
        }
      }
    }

    .item-right {
      .amount {
        font-size: 32rpx;
        font-weight: bold;
        color: #ef4444;
      }
    }
  }
}
</style>
