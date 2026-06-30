<template>
  <view class="password-page">
    <view class="header">
      <text class="title">密码管理</text>
      <text class="subtitle">共 {{ passwords.length }} 个账号</text>
    </view>

    <scroll-view
      scroll-y
      class="password-list"
      :refresher-enabled="true"
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="passwords.length === 0" class="empty-state">
        <uni-icons type="locked" size="48" color="#ccc" />
        <text class="empty-text">暂无密码记录</text>
      </view>

      <view v-for="item in passwords" :key="item.id" class="password-card" @click="handleEdit(item)" @longpress="handleDelete(item)">
        <view class="card-header">
          <view class="title-wrap">
            <uni-icons type="star-filled" size="18" :color="item.favorite ? '#f5a623' : '#e0e0e0'" />
            <text class="title-text">{{ item.title }}</text>
          </view>
          <view class="category-badge" v-if="item.category">
            <text>{{ item.category }}</text>
          </view>
        </view>
        
        <view class="card-body">
          <view class="info-row">
            <text class="label">账号</text>
            <text class="value">{{ item.username || '-' }}</text>
            <view class="copy-btn" @click="handleCopy(item.username || '')">
              <uni-icons type="copy" size="16" color="#007AFF" />
            </view>
          </view>
          
          <view class="info-row">
            <text class="label">密码</text>
            <text class="value password-mask">{{ showPassword[item.id!] ? item.password : '********' }}</text>
            <view class="actions">
              <view class="action-btn" @click="togglePassword(item.id!)">
                <uni-icons :type="showPassword[item.id!] ? 'eye' : 'eye-slash'" size="18" color="#666" />
              </view>
              <view class="action-btn" @click="handleCopy(item.password || '')">
                <uni-icons type="copy" size="16" color="#007AFF" />
              </view>
            </view>
          </view>
        </view>
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
import { queryPasswordVault, deletePasswordVault, type PasswordVaultEntity } from '@/api/password';

const passwords = ref<PasswordVaultEntity[]>([]);
const isRefreshing = ref(false);
const showPassword = ref<Record<number, boolean>>({});

const loadData = async () => {
  try {
    const res: any = await queryPasswordVault();
    // Assuming res returns an array or { items: [] }
    passwords.value = Array.isArray(res) ? res : res.data || res.items || res.records || res.list || (Array.isArray(res) ? res : []);
  } catch (error) {
    console.error('获取密码列表失败:', error);
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    isRefreshing.value = false;
  }
};

const onRefresh = () => {
  isRefreshing.value = true;
  loadData();
};

const togglePassword = (id: number) => {
  showPassword.value[id] = !showPassword.value[id];
};

const handleCopy = (text: string) => {
  if (!text) {
    uni.showToast({ title: '内容为空', icon: 'none' });
    return;
  }
  uni.setClipboardData({
    data: text,
    success: () => {
      uni.showToast({ title: '复制成功', icon: 'success' });
    }
  });
};

const handleAdd = () => {
  uni.navigateTo({ url: '/pages/record/password/edit' });
};

const handleEdit = (item: PasswordVaultEntity) => {
  uni.$emit('editPassword', item);
  uni.navigateTo({ url: '/pages/record/password/edit' });
};

const handleDelete = (item: PasswordVaultEntity) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除「${item.title}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await deletePasswordVault(item.id!);
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
.password-page {
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

.password-list {
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

.password-card {
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
    border-bottom: 1rpx solid #f5f5f5;
    padding-bottom: 16rpx;
    
    .title-wrap {
      display: flex;
      align-items: center;
      gap: 12rpx;
      
      .title-text {
        font-size: 30rpx;
        font-weight: 600;
        color: #333;
      }
    }
    
    .category-badge {
      background-color: #e6f7ff;
      padding: 4rpx 16rpx;
      border-radius: 20rpx;
      
      text {
        font-size: 22rpx;
        color: #1890ff;
      }
    }
  }
  
  .card-body {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
    
    .info-row {
      display: flex;
      align-items: center;
      
      .label {
        width: 80rpx;
        font-size: 26rpx;
        color: #999;
      }
      
      .value {
        flex: 1;
        font-size: 28rpx;
        color: #333;
        margin-right: 16rpx;
        
        &.password-mask {
          letter-spacing: 2rpx;
        }
      }
      
      .copy-btn {
        padding: 8rpx;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .actions {
        display: flex;
        align-items: center;
        gap: 16rpx;
        
        .action-btn {
          padding: 8rpx;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      }
    }
  }
}

.fab {
  position: fixed;
  right: 48rpx;
  bottom: 48rpx;
  width: 96rpx;
  height: 96rpx;
  background: linear-gradient(135deg, #1890ff, #36cfc9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(24, 144, 255, 0.4);
  
  &:active {
    opacity: 0.8;
    transform: scale(0.95);
  }
}
</style>
